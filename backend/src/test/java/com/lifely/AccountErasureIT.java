package com.lifely;

import com.lifely.user.UserDataExtras;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Xóa tài khoản phải xóa cả dữ liệu sức khỏe, thiết bị push, đồng ý và nhật ký thông báo; xuất dữ liệu phải có chúng.
 * Chỉ gọi UserDataExtras (không ẩn danh hóa người dùng demo). Cần PostgreSQL local có dữ liệu demo.
 */
@SpringBootTest(properties = {"lifely.notify.worker-initial-delay-ms=3600000"})
class AccountErasureIT {

    @Autowired UserDataExtras extras;
    @Autowired JdbcTemplate jdbc;

    @Test
    void eraseRemovesHealthPushConsentAndOutboxAndExportShowsThemFirst() {
        UUID userId = jdbc.queryForObject("SELECT u.id FROM users u JOIN donor_profiles d ON d.user_id=u.id WHERE u.status='ACTIVE' LIMIT 1", UUID.class);
        UUID donorId = jdbc.queryForObject("SELECT id FROM donor_profiles WHERE user_id=?", UUID.class, userId);
        jdbc.update("INSERT INTO health_data_consents (user_id, granted) VALUES (?, TRUE) ON CONFLICT (user_id) DO UPDATE SET granted=TRUE", userId);
        jdbc.update("INSERT INTO donor_health_checks (donor_id, heart_rate, systolic, diastolic, weight_kg) VALUES (?, 72, 120, 80, 60)", donorId);
        jdbc.update("INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, 'k', 'a')", userId, "https://fcm.googleapis.com/fcm/send/it-" + userId);
        jdbc.update("INSERT INTO notification_consents (user_id, channel, granted) VALUES (?, 'PUSH', TRUE) ON CONFLICT (user_id, channel) DO UPDATE SET granted=TRUE", userId);
        jdbc.update("INSERT INTO notification_outbox (dedupe_key, channel, recipient_user_id, purpose, body) VALUES (?, 'PUSH', ?, 'REJOIN_REMINDER', 'x')", "IT:ERASE:" + userId, userId);
        try {
            Map<String, Object> exported = extras.export(userId);
            assertEquals(Boolean.TRUE, exported.get("healthDataConsent"));
            assertEquals(1, ((java.util.List<?>) exported.get("healthChecks")).size());
            assertEquals(1, exported.get("pushDevices"));
            assertFalse(exported.toString().contains("fcm.googleapis.com"), "không xuất endpoint của thiết bị");

            extras.erase(userId);

            assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM donor_health_checks WHERE donor_id=?", Integer.class, donorId));
            assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM health_data_consents WHERE user_id=?", Integer.class, userId));
            assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM push_subscriptions WHERE user_id=?", Integer.class, userId));
            assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM notification_consents WHERE user_id=?", Integer.class, userId));
            assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM notification_outbox WHERE recipient_user_id=?", Integer.class, userId));
        } finally {
            jdbc.update("DELETE FROM notification_outbox WHERE dedupe_key=?", "IT:ERASE:" + userId);
        }
    }
}
