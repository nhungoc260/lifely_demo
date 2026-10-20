package com.lifely.admin;

import com.lifely.admin.dto.AdminUserOverview;
import com.lifely.audit.AuditService;
import com.lifely.common.AppException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/** Tổng hợp thông tin một người dùng cho admin. Mỗi lần xem đều được ghi nhật ký hoạt động. */
@Service
public class AdminUserOverviewService {

    private final JdbcTemplate jdbc;
    private final AuditService audit;

    public AdminUserOverviewService(JdbcTemplate jdbc, AuditService audit) {
        this.jdbc = jdbc;
        this.audit = audit;
    }

    private record Base(String fullName, String email, String phone, String status, String avatarUrl, OffsetDateTime createdAt) {
    }

    private int count(String sql, Object... args) {
        Integer n = jdbc.queryForObject(sql, Integer.class, args);
        return n == null ? 0 : n;
    }

    @Transactional(readOnly = true)
    public AdminUserOverview overview(UUID adminId, UUID userId) {
        var found = jdbc.query("SELECT full_name, email, phone, status, avatar_url, created_at FROM users WHERE id = ?",
                (rs, i) -> new Base(rs.getString("full_name"), rs.getString("email"), rs.getString("phone"),
                        rs.getString("status"), rs.getString("avatar_url"), rs.getObject("created_at", OffsetDateTime.class)),
                userId);
        if (found.isEmpty()) throw AppException.notFound("USER_NOT_FOUND", "Không tìm thấy người dùng");
        Base u = found.get(0);

        audit.log(adminId, "ADMIN_USER_VIEWED", "USER", userId, Map.of());

        OffsetDateTime lastActivity = jdbc.queryForObject("SELECT max(created_at) FROM audit_logs WHERE user_id = ?", OffsetDateTime.class, userId);
        int requests = count("SELECT count(*) FROM blood_requests WHERE requester_id = ?", userId);
        int reports = count("SELECT count(*) FROM reports WHERE target_type = 'USER' AND target_id = ?", userId);
        int openReports = count("SELECT count(*) FROM reports WHERE target_type = 'USER' AND target_id = ? AND status = 'OPEN'", userId);

        var donorRows = jdbc.query("""
                SELECT dp.id, bt.code AS blood_type, dp.city, dp.district, dp.availability_status, dp.last_donation_date, dp.total_donations
                  FROM donor_profiles dp LEFT JOIN blood_types bt ON bt.id = dp.blood_type_id
                 WHERE dp.user_id = ?
                """, (rs, i) -> {
            UUID donorId = rs.getObject("id", UUID.class);
            Map<String, Integer> byStatus = new HashMap<>();
            jdbc.query("SELECT status, count(*) AS n FROM matches WHERE donor_id = ? GROUP BY status",
                    r -> { byStatus.put(r.getString("status"), r.getInt("n")); }, donorId);
            int verified = count("SELECT count(*) FROM donation_history WHERE donor_id = ? AND verification_level IN ('ORG_VERIFIED', 'REQUESTER_CONFIRMED')", donorId);
            Date last = rs.getDate("last_donation_date");
            return new AdminUserOverview.DonorInfo(rs.getString("blood_type"), rs.getString("city"), rs.getString("district"),
                    rs.getString("availability_status"), last == null ? null : last.toLocalDate(), rs.getInt("total_donations"), verified,
                    byStatus.values().stream().mapToInt(Integer::intValue).sum(), byStatus.getOrDefault("ACCEPTED", 0),
                    byStatus.getOrDefault("COMPLETED", 0), byStatus.getOrDefault("REJECTED", 0), byStatus.getOrDefault("EXPIRED", 0));
        }, userId);

        return new AdminUserOverview(userId, u.fullName(), u.email(), u.phone(), u.status(), u.avatarUrl(),
                u.createdAt() == null ? null : u.createdAt().toInstant(), lastActivity == null ? null : lastActivity.toInstant(),
                requests, reports, openReports, donorRows.isEmpty() ? null : donorRows.get(0));
    }
}
