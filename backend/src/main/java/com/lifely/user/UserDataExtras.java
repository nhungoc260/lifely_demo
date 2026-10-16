package com.lifely.user;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Phần dữ liệu cá nhân thuộc các tính năng sức khỏe, đồng ý theo kênh, Web Push và lịch hẹn: xuất cùng "Dữ liệu của tôi"
 * và xóa khi người dùng xóa tài khoản (tài khoản chỉ bị ẩn danh hóa nên khóa ngoại CASCADE không tự chạy).
 * Không xuất endpoint/khóa của thiết bị push (chỉ số lượng thiết bị).
 */
@Component
public class UserDataExtras {

    private final JdbcTemplate jdbc;

    public UserDataExtras(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> export(UUID userId) {
        Map<String, Object> out = new LinkedHashMap<>();
        Integer hc = jdbc.queryForObject("SELECT count(*) FROM health_data_consents WHERE user_id = ? AND granted", Integer.class, userId);
        out.put("healthDataConsent", hc != null && hc > 0);
        List<String> gender = jdbc.queryForList("SELECT gender FROM donor_profiles WHERE user_id = ?", String.class, userId);
        out.put("gender", gender.isEmpty() ? null : gender.get(0));
        out.put("healthChecks", jdbc.query("""
                SELECT c.measured_at, c.heart_rate, c.systolic, c.diastolic, c.weight_kg
                  FROM donor_health_checks c JOIN donor_profiles d ON d.id = c.donor_id
                 WHERE d.user_id = ? ORDER BY c.measured_at
                """, (rs, i) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("measuredAt", String.valueOf(rs.getTimestamp("measured_at").toInstant()));
            m.put("heartRate", rs.getObject("heart_rate"));
            m.put("systolic", rs.getObject("systolic"));
            m.put("diastolic", rs.getObject("diastolic"));
            m.put("weightKg", rs.getBigDecimal("weight_kg"));
            return m;
        }, userId));
        Map<String, Object> channels = new LinkedHashMap<>();
        jdbc.query("SELECT channel, granted FROM notification_consents WHERE user_id = ? ORDER BY channel",
                rs -> {
                    channels.put(rs.getString("channel"), rs.getBoolean("granted"));
                }, userId);
        out.put("notificationConsents", channels);
        Integer devices = jdbc.queryForObject("SELECT count(*) FROM push_subscriptions WHERE user_id = ?", Integer.class, userId);
        out.put("pushDevices", devices == null ? 0 : devices);
        out.put("appointments", jdbc.query("""
                SELECT s.starts_at, o.name, a.status FROM appointments a
                  JOIN donor_profiles d ON d.id = a.donor_id JOIN donation_slots s ON s.id = a.slot_id
                  JOIN organizations o ON o.id = s.organization_id
                 WHERE d.user_id = ? ORDER BY s.starts_at
                """, (rs, i) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("startsAt", String.valueOf(rs.getTimestamp("starts_at").toInstant()));
            m.put("organization", rs.getString("name"));
            m.put("status", rs.getString("status"));
            return m;
        }, userId));
        return out;
    }

    /** Xóa dữ liệu của các tính năng trên. Lịch hẹn còn hiệu lực bị hủy và trả chỗ cho khung giờ. */
    @Transactional
    public void erase(UUID userId) {
        jdbc.update("""
                WITH c AS (UPDATE appointments a SET status = 'CANCELLED', cancelled_at = now()
                             FROM donor_profiles d WHERE a.donor_id = d.id AND d.user_id = ? AND a.status = 'BOOKED'
                           RETURNING a.slot_id)
                UPDATE donation_slots s SET booked_count = GREATEST(s.booked_count - x.n, 0)
                  FROM (SELECT slot_id, count(*)::int AS n FROM c GROUP BY slot_id) x WHERE s.id = x.slot_id
                """, userId);
        jdbc.update("DELETE FROM donor_health_checks WHERE donor_id IN (SELECT id FROM donor_profiles WHERE user_id = ?)", userId);
        jdbc.update("DELETE FROM health_data_consents WHERE user_id = ?", userId);
        jdbc.update("DELETE FROM push_subscriptions WHERE user_id = ?", userId);
        jdbc.update("DELETE FROM notification_outbox WHERE recipient_user_id = ?", userId);
        jdbc.update("DELETE FROM notification_consents WHERE user_id = ?", userId);
        jdbc.update("UPDATE donor_profiles SET gender = 'UNSPECIFIED', rejoin_reminded_for = NULL WHERE user_id = ?", userId);
    }
}
