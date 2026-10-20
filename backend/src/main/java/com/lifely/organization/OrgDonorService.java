package com.lifely.organization;

import com.lifely.audit.AuditService;
import com.lifely.common.AppException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** "Người hiến của cơ sở": chỉ những người đã đặt lịch hoặc đã được chính cơ sở xác nhận hiến, không phải danh bạ toàn hệ thống. */
@Service
public class OrgDonorService {

    private final OrganizationRepository organizations;
    private final JdbcTemplate jdbc;
    private final AuditService audit;

    public OrgDonorService(OrganizationRepository organizations, JdbcTemplate jdbc, AuditService audit) {
        this.organizations = organizations;
        this.jdbc = jdbc;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<OrgDonorEntry> list(UUID userId) {
        Organization org = organizations.findForUser(userId)
                .orElseThrow(() -> AppException.notFound("ORGANIZATION_NOT_FOUND", "Hãy hoàn tất hồ sơ tổ chức trước"));
        // Mỗi lần xem dữ liệu cá nhân của người hiến đều được ghi nhật ký.
        audit.log(userId, "ORG_DONORS_VIEWED", "ORGANIZATION", org.getId(), Map.of());
        return jdbc.query("""
                WITH linked AS (
                    SELECT a.donor_id, a.status, s.starts_at AS visit_at
                      FROM appointments a
                      JOIN donation_slots s ON s.id = a.slot_id
                     WHERE s.organization_id = ?
                    UNION ALL
                    SELECT dh.donor_id, 'DONATED' AS status, COALESCE(dh.confirmed_at, dh.created_at) AS visit_at
                      FROM donation_history dh
                     WHERE dh.confirmed_by_org_id = ?
                       AND NOT EXISTS (SELECT 1 FROM appointments x WHERE x.donation_id = dh.id)
                )
                SELECT dp.id AS donor_id, u.full_name, bt.code AS blood_type,
                       count(*) FILTER (WHERE l.status = 'DONATED') AS donations,
                       count(*) FILTER (WHERE l.status = 'NO_SHOW') AS no_shows,
                       count(*) FILTER (WHERE l.status IN ('BOOKED', 'CHECKED_IN', 'SCREENED')) AS upcoming,
                       max(l.visit_at) AS last_visit,
                       CASE WHEN count(*) FILTER (WHERE l.status IN ('BOOKED', 'CHECKED_IN', 'SCREENED')) > 0 THEN u.phone END AS phone
                  FROM linked l
                  JOIN donor_profiles dp ON dp.id = l.donor_id
                  JOIN users u ON u.id = dp.user_id
                  LEFT JOIN blood_types bt ON bt.id = dp.blood_type_id
                 GROUP BY dp.id, u.full_name, u.phone, bt.code
                 ORDER BY max(l.visit_at) DESC
                 LIMIT 200
                """, (rs, i) -> {
            OffsetDateTime last = rs.getObject("last_visit", OffsetDateTime.class);
            return new OrgDonorEntry(
                    rs.getObject("donor_id", UUID.class),
                    rs.getString("full_name"),
                    rs.getString("blood_type"),
                    rs.getInt("donations"),
                    rs.getInt("no_shows"),
                    rs.getInt("upcoming"),
                    last == null ? null : last.toInstant(),
                    rs.getString("phone"));
        }, org.getId(), org.getId());
    }
}
