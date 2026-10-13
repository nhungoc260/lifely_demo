package com.lifely.organization;

import com.lifely.common.AppException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/** Nhật ký các lần hiến máu do chính tổ chức này xác nhận (mới nhất trước, tối đa 200 dòng). */
@Service
public class OrganizationDonationService {

    private final OrganizationRepository organizations;
    private final JdbcTemplate jdbc;

    public OrganizationDonationService(OrganizationRepository organizations, JdbcTemplate jdbc) {
        this.organizations = organizations;
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public List<DonationLogEntry> list(UUID userId) {
        Organization org = organizations.findByOwnerUserId(userId)
                .orElseThrow(() -> AppException.notFound("ORGANIZATION_NOT_FOUND", "Hãy hoàn tất hồ sơ tổ chức trước"));
        return jdbc.query("""
                SELECT dh.id, dh.donated_on, dh.location, dh.verification_level, dh.confirmed_at,
                       u.full_name, bt.code AS blood_type
                  FROM donation_history dh
                  JOIN donor_profiles dp ON dp.id = dh.donor_id
                  JOIN users u ON u.id = dp.user_id
                  LEFT JOIN blood_types bt ON bt.id = dp.blood_type_id
                 WHERE dh.confirmed_by_org_id = ?
                 ORDER BY COALESCE(dh.confirmed_at, dh.created_at) DESC
                 LIMIT 200
                """, (rs, i) -> {
            OffsetDateTime at = rs.getObject("confirmed_at", OffsetDateTime.class);
            return new DonationLogEntry(
                    rs.getObject("id", UUID.class),
                    rs.getDate("donated_on").toLocalDate(),
                    rs.getString("full_name"),
                    rs.getString("blood_type"),
                    rs.getString("location"),
                    rs.getString("verification_level"),
                    at == null ? null : at.toInstant());
        }, org.getId());
    }
}
