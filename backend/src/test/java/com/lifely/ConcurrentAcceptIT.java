package com.lifely;

import com.lifely.auth.AuthUser;
import com.lifely.common.AppException;
import com.lifely.matching.MatchService;
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
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Yêu cầu bắt buộc (đặc tả mục 70): request cần 2 đơn vị, 6 donor bấm Accept ĐỒNG THỜI
 * thì đúng 2 người thành công và confirmed không bao giờ vượt 2.
 * Cần PostgreSQL local có dữ liệu demo.   Chạy:  mvn test -Dtest=ConcurrentAcceptIT
 */
@SpringBootTest
class ConcurrentAcceptIT {

    private static final int DONORS = 6;

    @Autowired
    MatchService matchService;
    @Autowired
    JdbcTemplate jdbc;
    @Autowired
    com.lifely.user.UserRepository userRepository;

    @Test
    void sixDonorsAcceptRequestNeedingTwo() throws Exception {
        UUID requestId = UUID.randomUUID();
        UUID requester = jdbc.queryForObject("SELECT id FROM users WHERE email='requester@lifely.demo'", UUID.class);
        jdbc.update("""
                INSERT INTO blood_requests (id, requester_id, blood_type_id, units_required, units_confirmed, urgency, status,
                  hospital_name, city, latitude, longitude, deadline, contact_phone, verified, verified_by)
                VALUES (?, ?, 1, 2, 0, 'CRITICAL', 'DONORS_CONTACTED', 'Concurrency Test Hospital', 'HCMC', 10.77, 106.70,
                        now() + interval '2 hours', '0901234567', TRUE, ?)
                """, requestId, requester, requester);

        List<UUID> donorUserIds = jdbc.queryForList(
                "SELECT d.user_id FROM donor_profiles d WHERE d.blood_type_id IN (1,2) LIMIT " + DONORS, UUID.class);
        assertEquals(DONORS, donorUserIds.size(), "Need at least " + DONORS + " O+/O- demo donors");

        List<UUID> matchIds = new ArrayList<>();
        for (UUID userId : donorUserIds) {
            UUID donorId = jdbc.queryForObject("SELECT id FROM donor_profiles WHERE user_id=?", UUID.class, userId);
            UUID matchId = UUID.randomUUID();
            jdbc.update("INSERT INTO matches (id, request_id, donor_id, matching_score, distance_km, status, contacted_at) "
                    + "VALUES (?, ?, ?, 90, 2, 'CONTACTED', now())", matchId, requestId, donorId);
            matchIds.add(matchId);
        }

        ExecutorService pool = Executors.newFixedThreadPool(DONORS);
        CountDownLatch ready = new CountDownLatch(DONORS);
        CountDownLatch go = new CountDownLatch(1);
        AtomicInteger success = new AtomicInteger();
        AtomicInteger rejected = new AtomicInteger();
        List<Future<?>> futures = new ArrayList<>();
        for (int i = 0; i < DONORS; i++) {
            final UUID userId = donorUserIds.get(i);
            final UUID matchId = matchIds.get(i);
            futures.add(pool.submit(() -> {
                AuthUser user = new AuthUser(userRepository.findById(userId).orElseThrow());
                ready.countDown();
                try {
                    go.await();
                    matchService.accept(user, matchId);
                    success.incrementAndGet();
                } catch (AppException e) {
                    assertTrue(e.getCode().equals("REQUEST_FULFILLED") || e.getCode().equals("REQUEST_CLOSED"), e.getCode());
                    rejected.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }));
        }
        ready.await();
        go.countDown();
        for (Future<?> f : futures) f.get(30, TimeUnit.SECONDS);
        pool.shutdown();

        Integer confirmed = jdbc.queryForObject("SELECT units_confirmed FROM blood_requests WHERE id=?", Integer.class, requestId);
        String status = jdbc.queryForObject("SELECT status FROM blood_requests WHERE id=?", String.class, requestId);
        Integer accepted = jdbc.queryForObject("SELECT count(*) FROM matches WHERE request_id=? AND status='ACCEPTED'", Integer.class, requestId);

        assertEquals(2, success.get(), "exactly 2 donors may win");
        assertEquals(DONORS - 2, rejected.get());
        assertEquals(2, confirmed, "confirmed must never exceed required");
        assertEquals(2, accepted);
        assertEquals("FULFILLED", status);

        jdbc.update("DELETE FROM request_status_history WHERE request_id=?", requestId);
        jdbc.update("DELETE FROM notifications WHERE reference_id=?", requestId);
        jdbc.update("DELETE FROM match_events WHERE match_id IN (SELECT id FROM matches WHERE request_id=?)", requestId);
        jdbc.update("DELETE FROM matches WHERE request_id=?", requestId);
        jdbc.update("DELETE FROM blood_requests WHERE id=?", requestId);
    }
}
