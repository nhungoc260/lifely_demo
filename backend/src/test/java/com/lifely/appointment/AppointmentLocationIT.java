package com.lifely.appointment;

import com.lifely.appointment.AppointmentDtos.ChangeLocationRequest;
import com.lifely.appointment.AppointmentDtos.CreateSlotRequest;
import com.lifely.appointment.AppointmentDtos.LocationChangeResult;
import com.lifely.appointment.AppointmentDtos.SlotDto;
import com.lifely.auth.AuthUser;
import com.lifely.common.AppException;
import com.lifely.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Địa điểm hiến máu riêng cho từng khung giờ + thông báo cho người đã đặt lịch khi địa điểm đổi.
 * Cần PostgreSQL local có dữ liệu demo.   Chạy:  mvn test -Dtest=AppointmentLocationIT
 */
@SpringBootTest(properties = {"lifely.notify.worker-initial-delay-ms=3600000"})
class AppointmentLocationIT {

    @Autowired AppointmentService service;
    @Autowired JdbcTemplate jdbc;
    @Autowired UserRepository userRepository;

    @Test
    void changingSlotLocationNotifiesBookedDonorsOnly() {
        UUID org = jdbc.queryForObject("SELECT id FROM organizations WHERE verification_status='VERIFIED' AND owner_user_id IS NOT NULL LIMIT 1", UUID.class);
        UUID ownerId = jdbc.queryForObject("SELECT owner_user_id FROM organizations WHERE id=?", UUID.class, org);
        AuthUser staff = new AuthUser(userRepository.findById(ownerId).orElseThrow());
        UUID donorUser = jdbc.queryForObject("""
                SELECT user_id FROM donor_profiles WHERE blood_type_id IS NOT NULL
                   AND (last_donation_date IS NULL OR last_donation_date < current_date - 200) LIMIT 1
                """, UUID.class);
        AuthUser donor = new AuthUser(userRepository.findById(donorUser).orElseThrow());

        Instant start = Instant.now().plus(Duration.ofDays(40)).plus(Duration.ofMinutes(UUID.randomUUID().hashCode() & 0x3FF));
        SlotDto slot = service.createSlot(staff, new CreateSlotRequest(start, start.plus(Duration.ofHours(2)), 3, "Điểm hiến máu lưu động, 1 Lê Lợi, Quận 1"));
        UUID appt = null;
        try {
            assertEquals("Điểm hiến máu lưu động, 1 Lê Lợi, Quận 1", slot.address(), "địa điểm riêng của khung giờ được lưu và hiển thị");
            appt = service.book(donor, slot.id()).id();

            LocationChangeResult r = service.changeLocation(staff, slot.id(), new ChangeLocationRequest("215 Hồng Bàng, Quận 5", false));
            assertEquals(1, r.updatedSlots());
            assertEquals(1, r.notifiedDonors());
            assertEquals("215 Hồng Bàng, Quận 5", r.slot().address());
            assertEquals("215 Hồng Bàng, Quận 5", service.mine(donor).stream().filter(a -> a.slotId().equals(slot.id())).findFirst().orElseThrow().address(),
                    "lịch của người hiến hiển thị địa điểm mới");
            Integer notified = jdbc.queryForObject("SELECT count(*) FROM notifications WHERE user_id=? AND reference_id=? AND title LIKE 'Địa điểm hiến máu đã thay đổi'",
                    Integer.class, donorUser, appt);
            assertEquals(1, notified, "người đã đặt lịch nhận đúng một thông báo");

            // Đổi sang đúng địa điểm hiện tại thì không làm phiền ai
            LocationChangeResult same = service.changeLocation(staff, slot.id(), new ChangeLocationRequest("215 Hồng Bàng, Quận 5", false));
            assertEquals(0, same.updatedSlots());
            assertEquals(0, same.notifiedDonors());

            // Khung giờ của cơ sở khác / không tồn tại: 404, không đổi được
            assertThrows(AppException.class, () -> service.changeLocation(staff, UUID.randomUUID(), new ChangeLocationRequest("Nơi khác", false)));
        } finally {
            if (appt != null) {
                jdbc.update("DELETE FROM notification_outbox WHERE reference_id=?", appt);
                jdbc.update("DELETE FROM notifications WHERE reference_id=?", appt);
                jdbc.update("DELETE FROM appointments WHERE id=?", appt);
            }
            jdbc.update("DELETE FROM donation_slots WHERE id=?", slot.id());
        }
    }
}
