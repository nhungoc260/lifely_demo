package com.lifely.screening;

import com.lifely.common.AppException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDate;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Dữ liệu sức khỏe chỉ lưu khi có đồng ý; kiểm tra nhanh không lưu; xóa/xuất được. Nhắc hiến lại đúng một lần mỗi lần hiến.
 * Cần PostgreSQL local có dữ liệu demo.   Chạy:  mvn test -Dtest=HealthIT
 */
@SpringBootTest(properties = {"lifely.notify.worker-initial-delay-ms=3600000", "lifely.jobs.rejoin-initial-delay-ms=3600000"})
class HealthIT {

    @Autowired DonorHealthService health;
    @Autowired RejoinReminderService reminders;
    @Autowired JdbcTemplate jdbc;

    private UUID userId;
    private UUID donorId;
    private Object oldLast;
    private String oldGender;
    private Object oldRemindedFor;
    private Boolean oldPref;

    @BeforeEach
    void setUp() {
        userId = jdbc.queryForObject("SELECT u.id FROM users u JOIN donor_profiles d ON d.user_id=u.id WHERE u.status='ACTIVE' ORDER BY u.id LIMIT 1", UUID.class);
        donorId = jdbc.queryForObject("SELECT id FROM donor_profiles WHERE user_id=?", UUID.class, userId);
        var row = jdbc.queryForMap("SELECT last_donation_date, gender, rejoin_reminded_for FROM donor_profiles WHERE id=?", donorId);
        oldLast = row.get("last_donation_date");
        oldGender = (String) row.get("gender");
        oldRemindedFor = row.get("rejoin_reminded_for");
        oldPref = jdbc.queryForObject("SELECT receive_rejoin_reminders FROM privacy_settings WHERE user_id=?", Boolean.class, userId);
        jdbc.update("DELETE FROM donor_health_checks WHERE donor_id=?", donorId);
        jdbc.update("DELETE FROM health_data_consents WHERE user_id=?", userId);
    }

    @AfterEach
    void tearDown() {
        jdbc.update("DELETE FROM donor_health_checks WHERE donor_id=?", donorId);
        jdbc.update("DELETE FROM health_data_consents WHERE user_id=?", userId);
        jdbc.update("DELETE FROM notifications WHERE user_id=? AND type='REJOIN_REMINDER'", userId);
        jdbc.update("DELETE FROM notification_outbox WHERE dedupe_key LIKE ?", "PUSH:REJOIN:" + donorId + ":%");
        jdbc.update("UPDATE donor_profiles SET last_donation_date=?, gender=?, rejoin_reminded_for=? WHERE id=?", oldLast, oldGender, oldRemindedFor, donorId);
        jdbc.update("UPDATE privacy_settings SET receive_rejoin_reminders=? WHERE user_id=?", oldPref, userId);
    }

    @Test
    void savingNeedsConsentButQuickCheckDoesNot() {
        var input = new DonorHealthService.AddRequest(72, 120, 80, 68.0);
        assertTrue(health.evaluate(userId, input).findings().stream().noneMatch(f -> f.status() == ScreeningEvaluator.Status.OUTSIDE));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM donor_health_checks WHERE donor_id=?", Integer.class, donorId), "kiểm tra nhanh không lưu gì");
        AppException e = assertThrows(AppException.class, () -> health.add(userId, input));
        assertEquals("HEALTH_CONSENT_REQUIRED", e.getCode());

        health.setConsent(userId, true, false);
        assertNotNull(health.add(userId, input).id());
        assertEquals(1, health.list(userId, 100).size());
    }

    @Test
    void outsideValuesAreFlaggedWithoutDiagnosisAndRevokeBlocksNewSaves() {
        health.setConsent(userId, true, false);
        var saved = health.add(userId, new DonorHealthService.AddRequest(95, 165, 98, null));
        assertTrue(saved.anyOutside());
        assertTrue(health.summary(userId).latestOutside());
        assertTrue(saved.findings().stream().filter(f -> f.status() == ScreeningEvaluator.Status.OUTSIDE)
                .allMatch(f -> f.note().contains("không phải chẩn đoán")));
        health.setConsent(userId, false, false);
        assertThrows(AppException.class, () -> health.add(userId, new DonorHealthService.AddRequest(70, null, null, null)));
        assertEquals(1, health.list(userId, 100).size(), "rút đồng ý không tự xóa dữ liệu cũ");
        health.setConsent(userId, false, true);
        assertEquals(0, health.list(userId, 100).size(), "rút đồng ý kèm xóa dữ liệu");
    }

    @Test
    void invalidInputIsRejectedAndExportContainsOnlyOwnData() {
        assertThrows(AppException.class, () -> health.evaluate(userId, new DonorHealthService.AddRequest(null, null, null, null)));
        assertThrows(AppException.class, () -> health.evaluate(userId, new DonorHealthService.AddRequest(400, null, null, null)));
        health.setConsent(userId, true, false);
        health.add(userId, new DonorHealthService.AddRequest(72, 120, 80, 68.0));
        String csv = health.exportCsv(userId);
        assertTrue(csv.startsWith("thoi_diem,nhip_tim"));
        assertEquals(2, csv.trim().split("\n").length, "tiêu đề + 1 dòng");
        assertEquals(1, health.deleteAll(userId));
    }

    @Test
    void rejoinReminderIsSentOnlyOncePerDonationAndRespectsPreference() {
        LocalDate today = LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        jdbc.update("UPDATE donor_profiles SET last_donation_date=?, gender='MALE', rejoin_reminded_for=NULL WHERE id=?", java.sql.Date.valueOf(today.minusDays(84)), donorId);
        jdbc.update("UPDATE privacy_settings SET receive_rejoin_reminders=FALSE WHERE user_id=?", userId);
        reminders.sendDue(today);
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM notifications WHERE user_id=? AND type='REJOIN_REMINDER'", Integer.class, userId), "đã tắt nhắc thì không nhắc");

        jdbc.update("UPDATE privacy_settings SET receive_rejoin_reminders=TRUE WHERE user_id=?", userId);
        reminders.sendDue(today);
        reminders.sendDue(today);   // chạy lặp
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM notifications WHERE user_id=? AND type='REJOIN_REMINDER'", Integer.class, userId), "chỉ một lần nhắc");
    }

    @Test
    void notYetEligibleDonorIsNotRemindedAndSummaryShowsDaysLeft() {
        LocalDate today = LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        jdbc.update("UPDATE donor_profiles SET last_donation_date=?, gender='MALE', rejoin_reminded_for=NULL WHERE id=?", java.sql.Date.valueOf(today.minusDays(30)), donorId);
        jdbc.update("UPDATE privacy_settings SET receive_rejoin_reminders=TRUE WHERE user_id=?", userId);
        reminders.sendDue(today);
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM notifications WHERE user_id=? AND type='REJOIN_REMINDER'", Integer.class, userId));
        var s = health.summary(userId);
        assertFalse(s.canDonate());
        assertEquals(54, s.daysUntilEligible(), "84 - 30 ngày (quy tắc mặc định)");
    }
}
