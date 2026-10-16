package com.lifely.appointment;

import com.lifely.appointment.AppointmentDtos.Action;
import com.lifely.auth.AuthUser;
import com.lifely.common.AppException;
import com.lifely.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Lịch hẹn KHÔNG phải máu có sẵn: kho chỉ đổi khi nhân viên cơ sở xác nhận DONATED; người ngoài không thao tác được.
 * Cần PostgreSQL local có dữ liệu demo.   Chạy:  mvn test -Dtest=AppointmentFlowIT
 */
@SpringBootTest(properties = {"lifely.notify.worker-initial-delay-ms=3600000"})
class AppointmentFlowIT {

    @Autowired AppointmentService service;
    @Autowired JdbcTemplate jdbc;
    @Autowired UserRepository userRepository;

    private int stock(UUID org, String type) {
        var l = jdbc.queryForList("SELECT units FROM blood_inventory WHERE organization_id=? AND blood_type=?", Integer.class, org, type);
        return l.isEmpty() ? 0 : l.get(0);
    }

    @Test
    void bookingDoesNotTouchInventoryUntilFacilityConfirmsDonation() {
        UUID org = jdbc.queryForObject("SELECT id FROM organizations WHERE verification_status='VERIFIED' AND owner_user_id IS NOT NULL LIMIT 1", UUID.class);
        Boolean autoAddBefore = jdbc.queryForObject("SELECT inventory_auto_add FROM organizations WHERE id=?", Boolean.class, org);
        jdbc.update("UPDATE organizations SET inventory_auto_add = TRUE WHERE id=?", org);   // mặc định tắt; bật để kiểm tra cộng kho
        UUID ownerId = jdbc.queryForObject("SELECT owner_user_id FROM organizations WHERE id=?", UUID.class, org);
        AuthUser staff = new AuthUser(userRepository.findById(ownerId).orElseThrow());
        UUID donorUser = jdbc.queryForObject("""
                SELECT user_id FROM donor_profiles WHERE blood_type_id IS NOT NULL
                   AND (last_donation_date IS NULL OR last_donation_date < current_date - 200) LIMIT 1
                """, UUID.class);
        AuthUser donor = new AuthUser(userRepository.findById(donorUser).orElseThrow());
        String type = jdbc.queryForObject("SELECT bt.code FROM donor_profiles d JOIN blood_types bt ON bt.id=d.blood_type_id WHERE d.user_id=?", String.class, donorUser);
        UUID slot = jdbc.queryForObject("""
                INSERT INTO donation_slots (organization_id, starts_at, ends_at, capacity)
                VALUES (?, now() + interval '21 days', now() + interval '21 days 1 hour', 2) RETURNING id
                """, UUID.class, org);
        int before = stock(org, type);

        UUID appt = service.book(donor, slot).id();
        assertEquals(before, stock(org, type), "đặt lịch không làm tăng kho");

        // Chuyển cách quãng không được phép
        assertThrows(AppException.class, () -> service.transition(staff, appt, Action.DONATED));
        service.transition(staff, appt, Action.CHECK_IN);
        assertEquals(before, stock(org, type));
        service.transition(staff, appt, Action.SCREEN_PASS);
        assertEquals(before, stock(org, type), "đã sàng lọc vẫn chưa phải máu trong kho");

        // Người không thuộc cơ sở không xác nhận được (404, không lộ sự tồn tại)
        AuthUser outsider = donor;
        assertThrows(AppException.class, () -> service.transition(outsider, appt, Action.DONATED));

        service.transition(staff, appt, Action.DONATED);
        assertEquals(before + 1, stock(org, type), "chỉ sau xác nhận của cơ sở mới cộng đúng 1 đơn vị");
        Integer ledger = jdbc.queryForObject("SELECT count(*) FROM inventory_movements WHERE organization_id=? AND reference_id=? AND reason='DONATION_CONFIRMED'", Integer.class, org, appt);
        assertEquals(1, ledger, "mỗi lần cộng có đúng một dòng sổ biến động");
        // Bấm lặp không cộng trùng
        assertThrows(AppException.class, () -> service.transition(staff, appt, Action.DONATED));
        assertEquals(before + 1, stock(org, type));

        jdbc.update("DELETE FROM inventory_movements WHERE reference_id=?", appt);
        jdbc.update("UPDATE blood_inventory SET units = ? WHERE organization_id=? AND blood_type=?", before, org, type);
        jdbc.update("DELETE FROM notifications WHERE reference_id=?", appt);
        jdbc.update("UPDATE appointments SET donation_id = NULL, status='SCREENED' WHERE id=?", appt);
        jdbc.update("DELETE FROM donation_history WHERE confirmed_by_org_id=? AND source='APPOINTMENT' AND donor_id=(SELECT id FROM donor_profiles WHERE user_id=?)", org, donorUser);
        jdbc.update("UPDATE donor_profiles SET total_donations = GREATEST(total_donations-1,0) WHERE user_id=?", donorUser);
        jdbc.update("DELETE FROM donation_slots WHERE id=?", slot);
        jdbc.update("UPDATE organizations SET inventory_auto_add = ? WHERE id=?", autoAddBefore, org);
    }

    @Test
    void cancelFreesTheSeatAndDoubleBookingIsRejected() {
        UUID org = jdbc.queryForObject("SELECT id FROM organizations WHERE verification_status='VERIFIED' LIMIT 1", UUID.class);
        UUID donorUser = jdbc.queryForObject("""
                SELECT user_id FROM donor_profiles WHERE last_donation_date IS NULL OR last_donation_date < current_date - 200 LIMIT 1
                """, UUID.class);
        AuthUser donor = new AuthUser(userRepository.findById(donorUser).orElseThrow());
        UUID slot = jdbc.queryForObject("""
                INSERT INTO donation_slots (organization_id, starts_at, ends_at, capacity)
                VALUES (?, now() + interval '22 days', now() + interval '22 days 1 hour', 1) RETURNING id
                """, UUID.class, org);
        UUID appt = service.book(donor, slot).id();
        AppException dup = assertThrows(AppException.class, () -> service.book(donor, slot));
        assertTrue(dup.getCode().equals("ALREADY_BOOKED") || dup.getCode().equals("APPOINTMENT_OVERLAP")
                || dup.getCode().equals("SLOT_FULL"));
        assertEquals(1, jdbc.queryForObject("SELECT booked_count FROM donation_slots WHERE id=?", Integer.class, slot));
        service.cancel(donor, appt);
        assertEquals(0, jdbc.queryForObject("SELECT booked_count FROM donation_slots WHERE id=?", Integer.class, slot));
        jdbc.update("DELETE FROM notifications WHERE reference_id=?", appt);
        jdbc.update("DELETE FROM donation_slots WHERE id=?", slot);
    }
}
