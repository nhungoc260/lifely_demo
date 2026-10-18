package com.lifely.admin;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Số liệu CHỈ ĐỌC toàn hệ thống cho admin: kho máu, lịch hiến, vận hành. Admin chỉ xem, không sửa dữ liệu của cơ sở.
 * Không trả số điện thoại hay thông tin sức khỏe.
 */
@Service
public class AdminOverviewService {

    public record InventoryByType(String bloodType, long units, long facilities, long lowFacilities) {
    }

    public record InventoryByOrg(UUID organizationId, String name, String city, long totalUnits, long lowTypes, Instant updatedAt) {
    }

    /** Một ô kho: cơ sở, nhóm máu, số đơn vị và ngưỡng cảnh báo (đơn vị &lt;= ngưỡng là thấp). */
    public record InventoryCell(UUID organizationId, String bloodType, long units, long lowThreshold) {
    }

    public record AppointmentRow(UUID id, String status, Instant startsAt, String organizationName, String donorName) {
    }

    /** Một tin gửi ngoài ứng dụng bị lỗi. Không có nội dung tin và không có số điện thoại. */
    public record FailedDelivery(String channel, String purpose, String errorCode, int attempts, Instant at) {
    }

    /** Một lần nhân viên ghi nhận kết quả liên hệ người hiến: ai liên hệ ai, cho yêu cầu nào, kết quả gì. Không có số điện thoại. */
    public record ContactLogEntry(UUID matchId, UUID requestId, String result, Instant at, String donorName, String staffName,
                                  String bloodType, String hospital) {
    }

    private final JdbcTemplate jdbc;

    public AdminOverviewService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> inventory() {
        List<InventoryByType> byType = jdbc.query("""
                SELECT blood_type, sum(units) AS units, count(*) AS facilities,
                       count(*) FILTER (WHERE units <= low_threshold) AS low_facilities
                FROM blood_inventory GROUP BY blood_type ORDER BY blood_type
                """, (rs, i) -> new InventoryByType(rs.getString("blood_type"), rs.getLong("units"),
                rs.getLong("facilities"), rs.getLong("low_facilities")));
        List<InventoryByOrg> byOrg = jdbc.query("""
                SELECT o.id, o.name, o.city, sum(i.units) AS total_units,
                       count(*) FILTER (WHERE i.units <= i.low_threshold) AS low_types, max(i.updated_at) AS updated_at
                FROM blood_inventory i JOIN organizations o ON o.id = i.organization_id
                GROUP BY o.id, o.name, o.city
                ORDER BY low_types DESC, total_units ASC, o.name LIMIT 50
                """, (rs, i) -> new InventoryByOrg(rs.getObject("id", UUID.class), rs.getString("name"), rs.getString("city"),
                rs.getLong("total_units"), rs.getLong("low_types"), rs.getTimestamp("updated_at").toInstant()));
        List<InventoryCell> cells = jdbc.query("""
                SELECT i.organization_id, i.blood_type, i.units, i.low_threshold
                FROM blood_inventory i JOIN organizations o ON o.id = i.organization_id
                ORDER BY o.name, i.blood_type LIMIT 2000
                """, (rs, i) -> new InventoryCell(rs.getObject("organization_id", UUID.class), rs.getString("blood_type"),
                rs.getLong("units"), rs.getLong("low_threshold")));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("byBloodType", byType);
        out.put("byOrganization", byOrg);
        out.put("cells", cells);
        return out;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> appointments() {
        List<Map<String, Object>> statuses = jdbc.queryForList(
                "SELECT status, count(*) AS total FROM appointments GROUP BY status ORDER BY total DESC");
        Map<String, Object> slots = jdbc.queryForMap("""
                SELECT count(*) AS active_slots, coalesce(sum(capacity), 0) AS capacity, coalesce(sum(booked_count), 0) AS booked
                FROM donation_slots WHERE status = 'ACTIVE' AND starts_at >= now()
                """);
        List<AppointmentRow> recent = jdbc.query("""
                SELECT a.id, a.status, s.starts_at, o.name AS org_name, u.full_name AS donor_name
                FROM appointments a
                JOIN donation_slots s ON s.id = a.slot_id
                JOIN organizations o ON o.id = s.organization_id
                JOIN donor_profiles d ON d.id = a.donor_id
                JOIN users u ON u.id = d.user_id
                WHERE s.starts_at >= now() - interval '30 days' AND s.starts_at <= now() + interval '60 days'
                ORDER BY s.starts_at DESC LIMIT 100
                """, (rs, i) -> new AppointmentRow(rs.getObject("id", UUID.class), rs.getString("status"),
                rs.getTimestamp("starts_at").toInstant(), rs.getString("org_name"), rs.getString("donor_name")));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("statusCounts", statuses);
        out.put("upcomingSlots", Map.of("activeSlots", slots.get("active_slots"), "capacity", slots.get("capacity"),
                "booked", slots.get("booked")));
        out.put("recent", recent);
        return out;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> operations() {
        List<Map<String, Object>> delivery = jdbc.queryForList("""
                SELECT channel, status, count(*) AS total FROM notification_outbox
                WHERE created_at >= now() - interval '7 days' GROUP BY channel, status ORDER BY channel, status
                """);
        List<Map<String, Object>> topOrgs = jdbc.queryForList("""
                SELECT o.name, count(r.id) AS requests,
                       count(r.id) FILTER (WHERE r.status = 'FULFILLED') AS fulfilled,
                       count(r.id) FILTER (WHERE r.status = 'EXPIRED') AS expired
                FROM blood_requests r JOIN organizations o ON o.id = r.organization_id
                WHERE r.created_at >= now() - interval '30 days'
                GROUP BY o.id, o.name ORDER BY requests DESC, o.name LIMIT 10
                """);
        List<Map<String, Object>> contact = jdbc.queryForList("""
                SELECT contact_result AS result, count(*) AS total FROM matches
                WHERE contact_result <> 'NOT_CONTACTED' GROUP BY contact_result ORDER BY total DESC
                """);
        List<ContactLogEntry> contactLog = jdbc.query("""
                SELECT m.id, m.request_id, m.contact_result AS result, m.contact_result_at AS at,
                       du.full_name AS donor_name, staff.full_name AS staff_name, bt.code AS blood_type,
                       coalesce(o.name, r.hospital_name) AS hospital
                FROM matches m
                JOIN blood_requests r ON r.id = m.request_id
                JOIN blood_types bt ON bt.id = r.blood_type_id
                JOIN donor_profiles d ON d.id = m.donor_id
                JOIN users du ON du.id = d.user_id
                LEFT JOIN users staff ON staff.id = m.contact_result_by
                LEFT JOIN organizations o ON o.id = r.organization_id
                WHERE m.contact_result <> 'NOT_CONTACTED'
                ORDER BY m.contact_result_at DESC NULLS LAST, m.id LIMIT 30
                """, (rs, i) -> new ContactLogEntry(rs.getObject("id", UUID.class), rs.getObject("request_id", UUID.class),
                rs.getString("result"), rs.getTimestamp("at") == null ? null : rs.getTimestamp("at").toInstant(),
                rs.getString("donor_name"), rs.getString("staff_name"), rs.getString("blood_type"), rs.getString("hospital")));
        List<FailedDelivery> failed = jdbc.query("""
                SELECT channel, purpose, last_error_code, attempts, updated_at FROM notification_outbox
                WHERE status = 'FAILED' AND updated_at >= now() - interval '7 days'
                ORDER BY updated_at DESC LIMIT 20
                """, (rs, i) -> new FailedDelivery(rs.getString("channel"), rs.getString("purpose"), rs.getString("last_error_code"),
                rs.getInt("attempts"), rs.getTimestamp("updated_at").toInstant()));
        List<Map<String, Object>> reports = jdbc.queryForList(
                "SELECT status, count(*) AS total FROM reports GROUP BY status ORDER BY total DESC");
        Long noShows = jdbc.queryForObject("SELECT count(*) FROM appointments WHERE status = 'NO_SHOW'", Long.class);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("notificationDelivery7d", delivery);
        out.put("topOrganizations30d", topOrgs);
        out.put("contactResults", contact);
        out.put("contactLog", contactLog);
        out.put("failedDeliveries", failed);
        out.put("reportsByStatus", reports);
        out.put("appointmentNoShows", noShows == null ? 0 : noShows);
        return out;
    }
}
