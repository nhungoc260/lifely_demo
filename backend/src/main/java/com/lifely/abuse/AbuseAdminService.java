package com.lifely.abuse;

import com.lifely.audit.AuditService;
import com.lifely.auth.AuthUser;
import com.lifely.common.AppException;
import com.lifely.common.Sanitizer;
import com.lifely.request.RequestService;
import com.lifely.request.RequestStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Hàng đợi giám sát cho admin: xem cờ bất thường, xác nhận (hủy yêu cầu nếu còn hiệu lực) hoặc bỏ qua. */
@Service
public class AbuseAdminService {

    public enum Decision { DISMISSED, CONFIRMED }

    public record FlagRow(UUID id, String subjectType, UUID subjectId, String subjectLabel, String ruleCode, String severity,
                          String autoAction, String detail, String status, Instant createdAt, Instant reviewedAt,
                          String reviewNote) {
    }

    public record Overview(long open, long openHigh, long autoActions, long confirmed, long dismissed, List<FlagRow> rows) {
    }

    private static final Set<String> STATUSES = Set.of("OPEN", "DISMISSED", "CONFIRMED", "ALL");

    private static final String SELECT = """
            SELECT f.id, f.subject_type, f.subject_id, f.rule_code, f.severity, f.auto_action, f.detail, f.status,
                   f.created_at, f.reviewed_at, f.review_note,
                   CASE f.subject_type
                     WHEN 'REQUEST' THEN (SELECT 'Yêu cầu ' || bt.code || ' tại ' || r.hospital_name || ' (' || r.status || ')'
                                            FROM blood_requests r JOIN blood_types bt ON bt.id = r.blood_type_id WHERE r.id = f.subject_id)
                     WHEN 'APPOINTMENT' THEN (SELECT 'Lịch hiến của ' || u.full_name || ' tại ' || o.name
                                            FROM appointments a JOIN donation_slots s ON s.id = a.slot_id
                                            JOIN organizations o ON o.id = s.organization_id
                                            JOIN donor_profiles dp ON dp.id = a.donor_id JOIN users u ON u.id = dp.user_id
                                           WHERE a.id = f.subject_id)
                     WHEN 'MATCH' THEN (SELECT 'Lượt hiến khẩn cấp của ' || u.full_name || ' tại ' || r.hospital_name
                                            FROM matches m JOIN blood_requests r ON r.id = m.request_id
                                            JOIN donor_profiles dp ON dp.id = m.donor_id JOIN users u ON u.id = dp.user_id
                                           WHERE m.id = f.subject_id)
                     WHEN 'ORGANIZATION' THEN (SELECT 'Cơ sở ' || o.name FROM organizations o WHERE o.id = f.subject_id)
                   END AS label
              FROM abuse_flags f
            """;

    private static final RowMapper<FlagRow> MAPPER = (rs, i) -> new FlagRow(rs.getObject("id", UUID.class),
            rs.getString("subject_type"), rs.getObject("subject_id", UUID.class), rs.getString("label"),
            rs.getString("rule_code"), rs.getString("severity"), rs.getString("auto_action"), rs.getString("detail"),
            rs.getString("status"), rs.getTimestamp("created_at").toInstant(), instant(rs.getTimestamp("reviewed_at")),
            rs.getString("review_note"));

    private final JdbcTemplate jdbc;
    private final RequestService requestService;
    private final AuditService audit;

    public AbuseAdminService(JdbcTemplate jdbc, RequestService requestService, AuditService audit) {
        this.jdbc = jdbc;
        this.requestService = requestService;
        this.audit = audit;
    }

    private static Instant instant(Timestamp t) {
        return t == null ? null : t.toInstant();
    }

    @Transactional(readOnly = true)
    public Overview overview(String status) {
        String st = status == null ? "OPEN" : status.toUpperCase();
        if (!STATUSES.contains(st)) {
            throw AppException.badRequest("INVALID_STATUS", "Trạng thái không hợp lệ");
        }
        long[] c = jdbc.queryForObject("""
                SELECT COUNT(*) FILTER (WHERE status = 'OPEN'),
                       COUNT(*) FILTER (WHERE status = 'OPEN' AND severity = 'HIGH'),
                       COUNT(*) FILTER (WHERE auto_action <> 'NONE'),
                       COUNT(*) FILTER (WHERE status = 'CONFIRMED'),
                       COUNT(*) FILTER (WHERE status = 'DISMISSED')
                  FROM abuse_flags
                """, (rs, i) -> new long[]{rs.getLong(1), rs.getLong(2), rs.getLong(3), rs.getLong(4), rs.getLong(5)});
        List<FlagRow> rows = jdbc.query(SELECT + """
                 WHERE (? = 'ALL' OR f.status = ?)
                 ORDER BY CASE f.severity WHEN 'HIGH' THEN 0 ELSE 1 END, f.created_at DESC LIMIT 200
                """, MAPPER, st, st);
        return new Overview(c[0], c[1], c[2], c[3], c[4], rows);
    }

    @Transactional
    public FlagRow review(AuthUser admin, UUID id, Decision decision, String note) {
        List<Object[]> found = jdbc.query("""
                SELECT subject_type, subject_id FROM abuse_flags WHERE id = ? AND status = 'OPEN' FOR UPDATE
                """, (rs, i) -> new Object[]{rs.getString("subject_type"), rs.getObject("subject_id", UUID.class)}, id);
        if (found.isEmpty()) {
            throw AppException.conflict("FLAG_NOT_OPEN", "Cờ này không còn ở trạng thái chờ xử lý");
        }
        String type = (String) found.get(0)[0];
        UUID subjectId = (UUID) found.get(0)[1];
        String clean = Sanitizer.plain(note);
        jdbc.update("""
                UPDATE abuse_flags SET status = ?, reviewed_by = ?, reviewed_at = now(), review_note = ? WHERE id = ?
                """, decision.name(), admin.getId(), clean, id);
        if (decision == Decision.CONFIRMED && "REQUEST".equals(type)) {
            // Chỉ gọi hủy khi còn hủy được: ném ngoại lệ trong transaction chung sẽ khiến cả giao dịch rollback.
            List<String> st = jdbc.queryForList("SELECT status FROM blood_requests WHERE id = ?", String.class, subjectId);
            if (!st.isEmpty() && RequestStatus.CANCELLABLE.contains(RequestStatus.valueOf(st.get(0)))) {
                requestService.cancel(admin, subjectId, "Admin xác nhận dấu hiệu bất thường");
            }
        }
        audit.log(admin.getId(), "ABUSE_FLAG_" + decision.name(), "ABUSE_FLAG", id, Map.of("subjectType", type));
        return jdbc.query(SELECT + " WHERE f.id = ?", MAPPER, id).get(0);
    }
}
