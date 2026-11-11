package com.lifely.abuse;

import com.lifely.abuse.AbuseRules.Finding;
import com.lifely.abuse.AbuseRules.Severity;
import com.lifely.admin.AdminAlerts;
import com.lifely.request.BloodRequest;
import com.lifely.request.Urgency;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Lớp giám sát chống lạm dụng. Duyệt tự động vẫn là mặc định; dịch vụ này chạy ngay sau đó:
 * tín hiệu rất mạnh (HIGH) thì yêu cầu bị hủy ngay / không cho ghi nhận hỗ trợ, tín hiệu vừa (MEDIUM) thì cho đi tiếp
 * nhưng mở cờ để admin xem. Mọi cờ đều lưu lý do cụ thể để admin quyết định nhanh.
 */
@Service
public class AbuseGuardService {

    public record Verdict(boolean autoBlock, List<Finding> findings) {
        public String summary() {
            return findings.stream().map(Finding::detail).reduce((a, b) -> a + "; " + b).orElse("");
        }
    }

    private final JdbcTemplate jdbc;
    private final AdminAlerts adminAlerts;

    public AbuseGuardService(JdbcTemplate jdbc, AdminAlerts adminAlerts) {
        this.jdbc = jdbc;
        this.adminAlerts = adminAlerts;
    }

    /** Chạy trong transaction tạo yêu cầu (yêu cầu đã được lưu). Cờ được lưu cùng transaction. */
    public Verdict assessRequest(BloodRequest r, UUID requesterId, boolean hasVerifiedFacility,
                                 Double homeLat, Double homeLng) {
        List<Finding> found = new ArrayList<>();
        add(found, AbuseRules.phoneSharing(count("""
                SELECT COUNT(DISTINCT requester_id) FROM blood_requests
                 WHERE contact_phone = ? AND created_at > now() - interval '30 days'
                """, r.getContactPhone())));
        long[] v = jdbc.queryForObject("""
                SELECT COUNT(*) FILTER (WHERE created_at > now() - interval '1 hour'), COUNT(*)
                  FROM blood_requests WHERE requester_id = ? AND created_at > now() - interval '24 hours'
                """, (rs, i) -> new long[]{rs.getLong(1), rs.getLong(2)}, requesterId);
        add(found, AbuseRules.velocity(v[0], v[1]));
        add(found, AbuseRules.repeatedCancel(count("""
                SELECT COUNT(*) FROM blood_requests
                 WHERE requester_id = ? AND status = 'CANCELLED' AND id <> ? AND created_at > now() - interval '24 hours'
                """, requesterId, r.getId())));
        Boolean fresh = jdbc.queryForObject(
                "SELECT created_at > now() - interval '30 minutes' FROM users WHERE id = ?", Boolean.class, requesterId);
        add(found, AbuseRules.newAccountCritical(Boolean.TRUE.equals(fresh), r.getUrgency() == Urgency.CRITICAL, hasVerifiedFacility));
        add(found, AbuseRules.highUnits(r.getUnitsRequired(), hasVerifiedFacility));
        if (homeLat != null && homeLng != null && r.getLatitude() != null && r.getLongitude() != null) {
            add(found, AbuseRules.homeFar(AbuseRules.haversineKm(homeLat, homeLng,
                    r.getLatitude().doubleValue(), r.getLongitude().doubleValue())));
        }
        boolean block = found.stream().anyMatch(f -> f.severity() == Severity.HIGH);
        for (Finding f : found) {
            insertFlag("REQUEST", r.getId(), f, f.severity() == Severity.HIGH ? "AUTO_CANCELLED" : "NONE");
        }
        if (!found.isEmpty()) {
            adminAlerts.raise(block ? "Đã tự động hủy yêu cầu bất thường" : "Yêu cầu cần admin theo dõi",
                    "Yêu cầu nhóm " + r.getBloodType().getCode() + " tại " + r.getHospitalName() + ": "
                            + new Verdict(block, found).summary(), "REQUEST", r.getId());
        }
        return new Verdict(block, found);
    }

    /**
     * Ghi cờ trong transaction RIÊNG để cờ vẫn được lưu khi nghiệp vụ gọi nó bị từ chối (rollback).
     * Phải gọi từ bean khác để proxy giao dịch có hiệu lực.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordFlag(String subjectType, UUID subjectId, Finding finding, String autoAction) {
        insertFlag(subjectType, subjectId, finding, autoAction);
        adminAlerts.raise(finding.severity() == Severity.HIGH ? "Cờ bất thường mức cao" : "Cờ bất thường cần xem",
                finding.detail(), subjectType, subjectId);
    }

    /** Lý do không cho ghi nhận hỗ trợ cho lịch này (có cờ HIGH chưa xử lý), hoặc null nếu được phép. */
    @Transactional(readOnly = true)
    public String supportBlockReason(UUID appointmentId) {
        List<String> rows = jdbc.queryForList("""
                SELECT detail FROM abuse_flags
                 WHERE subject_type = 'APPOINTMENT' AND subject_id = ? AND severity = 'HIGH' AND status = 'OPEN'
                 ORDER BY created_at LIMIT 1
                """, String.class, appointmentId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    private void add(List<Finding> list, Finding f) {
        if (f != null) {
            list.add(f);
        }
    }

    private long count(String sql, Object... args) {
        Long n = jdbc.queryForObject(sql, Long.class, args);
        return n == null ? 0 : n;
    }

    private void insertFlag(String subjectType, UUID subjectId, Finding f, String autoAction) {
        jdbc.update("""
                INSERT INTO abuse_flags (subject_type, subject_id, rule_code, severity, auto_action, detail)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT (subject_type, subject_id, rule_code) WHERE status = 'OPEN' DO NOTHING
                """, subjectType, subjectId, f.ruleCode(), f.severity().name(), autoAction,
                f.detail().length() > 500 ? f.detail().substring(0, 500) : f.detail());
    }
}
