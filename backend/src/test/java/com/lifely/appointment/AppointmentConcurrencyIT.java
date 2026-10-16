package com.lifely.appointment;

import com.lifely.auth.AuthUser;
import com.lifely.common.AppException;
import com.lifely.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Yêu cầu bắt buộc (mục 6.2/10.8): khung giờ 3 chỗ, 12 người đặt ĐỒNG THỜI => đúng 3 lịch được xác nhận,
 * 9 người nhận SLOT_FULL, booked_count không bao giờ vượt capacity.
 * Cần PostgreSQL local có dữ liệu demo.   Chạy:  mvn test -Dtest=AppointmentConcurrencyIT
 */
@SpringBootTest(properties = {"lifely.notify.worker-initial-delay-ms=3600000"})
class AppointmentConcurrencyIT {

    private static final int CAPACITY = 3;
    private static final int DONORS = 12;

    @Autowired AppointmentService service;
    @Autowired JdbcTemplate jdbc;
    @Autowired UserRepository userRepository;

    @Test
    void manyDonorsBookSameSlotNeverExceedsCapacity() throws Exception {
        UUID org = jdbc.queryForObject("SELECT id FROM organizations WHERE verification_status='VERIFIED' LIMIT 1", UUID.class);
        UUID slot = jdbc.queryForObject("""
                INSERT INTO donation_slots (organization_id, starts_at, ends_at, capacity)
                VALUES (?, now() + interval '20 days', now() + interval '20 days 1 hour', ?) RETURNING id
                """, UUID.class, org, CAPACITY);
        List<UUID> userIds = jdbc.queryForList("""
                SELECT user_id FROM donor_profiles
                 WHERE last_donation_date IS NULL OR last_donation_date < current_date - 200 LIMIT
                """ + DONORS, UUID.class);
        assertEquals(DONORS, userIds.size(), "cần ít nhất " + DONORS + " donor demo đủ giãn cách");

        ExecutorService pool = Executors.newFixedThreadPool(DONORS);
        CountDownLatch ready = new CountDownLatch(DONORS);
        CountDownLatch go = new CountDownLatch(1);
        AtomicInteger success = new AtomicInteger();
        AtomicInteger full = new AtomicInteger();
        AtomicInteger other = new AtomicInteger();
        List<Future<?>> futures = new ArrayList<>();
        for (UUID uid : userIds) {
            AuthUser user = new AuthUser(userRepository.findById(uid).orElseThrow());
            futures.add(pool.submit(() -> {
                ready.countDown();
                try {
                    go.await();
                    service.book(user, slot);
                    success.incrementAndGet();
                } catch (AppException e) {
                    if ("SLOT_FULL".equals(e.getCode())) full.incrementAndGet(); else other.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }));
        }
        ready.await();
        go.countDown();
        for (Future<?> f : futures) f.get(30, TimeUnit.SECONDS);
        pool.shutdown();

        Integer booked = jdbc.queryForObject("SELECT booked_count FROM donation_slots WHERE id=?", Integer.class, slot);
        Integer rows = jdbc.queryForObject("SELECT count(*) FROM appointments WHERE slot_id=? AND status='BOOKED'", Integer.class, slot);
        assertEquals(CAPACITY, success.get(), "đúng sức chứa được xác nhận");
        assertEquals(DONORS - CAPACITY, full.get(), "những người còn lại nhận SLOT_FULL");
        assertEquals(0, other.get());
        assertEquals(CAPACITY, booked);
        assertEquals(CAPACITY, rows);

        jdbc.update("DELETE FROM notifications WHERE reference_id IN (SELECT id FROM appointments WHERE slot_id=?)", slot);
        jdbc.update("DELETE FROM donation_slots WHERE id=?", slot);   // appointments xóa theo ON DELETE CASCADE
    }
}
