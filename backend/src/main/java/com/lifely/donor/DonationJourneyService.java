package com.lifely.donor;

import com.lifely.common.AppException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Cho người hiến biết lần hiến của mình đã được nhập kho của cơ sở nào, lúc nào.
 * Dựa trên sổ biến động kho (DONATION_CONFIRMED); chỉ đọc, không thay đổi cách kho tính số lượng.
 * Hệ thống chưa theo dõi từng đơn vị máu nên không có mốc xuất kho.
 */
@Service
public class DonationJourneyService {

    private final JdbcTemplate jdbc;

    public DonationJourneyService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public DonationJourney journey(UUID userId, UUID donationId) {
        var rows = jdbc.query("""
                SELECT m.created_at, o.name
                  FROM donation_history dh
                  JOIN donor_profiles dp ON dp.id = dh.donor_id
                  LEFT JOIN inventory_movements m ON m.reason = 'DONATION_CONFIRMED' AND (
                        (m.reference_type = 'MATCH' AND m.reference_id = dh.match_id)
                     OR (m.reference_type = 'APPOINTMENT'
                         AND m.reference_id IN (SELECT a.id FROM appointments a WHERE a.donation_id = dh.id)))
                  LEFT JOIN organizations o ON o.id = m.organization_id
                 WHERE dh.id = ? AND dp.user_id = ?
                 ORDER BY m.created_at NULLS LAST
                 LIMIT 1
                """, (rs, i) -> {
            OffsetDateTime at = rs.getObject("created_at", OffsetDateTime.class);
            return new DonationJourney(at != null, at == null ? null : at.toInstant(), rs.getString("name"));
        }, donationId, userId);
        if (rows.isEmpty()) throw AppException.notFound("DONATION_NOT_FOUND", "Không tìm thấy lần hiến này");
        return rows.get(0);
    }
}
