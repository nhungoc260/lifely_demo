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

    public record UpcomingAppointment(UUID id, String status, Instant startsAt, String organizationName, String donorName) {
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
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("byBloodType", byType);
        out.put("byOrganization", byOrg);
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
        List<UpcomingAppointment> upcoming = jdbc.query("""
                SELECT a.id, a.status, s.starts_at, o.name AS org_name, u.full_name AS donor_name
                FROM appointments a
                JOIN donation_slots s ON s.id = a.slot_id
                JOIN organizations o ON o.id = s.organization_id
                JOIN donor_profiles d ON d.id = a.donor_id
                JOIN users u ON u.id = d.user_id
                WHERE a.status IN ('BOOKED', 'CHECKED_IN', 'SCREENED') AND s.starts_at >= now() - interval '1 day'
                ORDER BY s.starts_at LIMIT 30
                """, (rs, i) -> new UpcomingAppointment(rs.getObject("id", UUID.class), rs.getString("status"),
                rs.getTimestamp("starts_at").toInstant(), rs.getString("org_name"), rs.getString("donor_name")));
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("statusCounts", statuses);
        out.put("upcomingSlots", Map.of("activeSlots", slots.get("active_slots"), "capacity", slots.get("capacity"),
                "booked", slots.get("booked")));
        out.put("upcoming", upcoming);
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
        List<Map<String, Object>> reports = jdbc.queryForList(
                "SELECT status, count(*) AS total FROM reports GROUP BY status ORDER BY total DESC");
        Long noShows = jdbc.queryForObject("SELECT count(*) FROM appointments WHERE status = 'NO_SHOW'", Long.class);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("notificationDelivery7d", delivery);
        out.put("topOrganizations30d", topOrgs);
        out.put("contactResults", contact);
        out.put("reportsByStatus", reports);
        out.put("appointmentNoShows", noShows == null ? 0 : noShows);
        return out;
    }
}
