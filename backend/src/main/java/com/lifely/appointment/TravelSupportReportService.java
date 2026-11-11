package com.lifely.appointment;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Báo cáo cho admin: mức hỗ trợ đi lại mỗi cơ sở công bố và số lần hiến đã được ghi nhận chi hỗ trợ.
 * Chỉ là sổ ghi nhận do cơ sở tự khai; LIFELY không thu hay chuyển tiền.
 */
@Service
public class TravelSupportReportService {

    public record Row(UUID organizationId, String organizationName, String city, int policyVnd, Integer parkingFeeVnd,
                      long donated, long paid, long unpaid, long paidTotalVnd) {
    }

    public record Report(List<Row> rows, long donated, long paid, long unpaid, long paidTotalVnd) {
    }

    private final JdbcTemplate jdbc;

    public TravelSupportReportService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public Report report() {
        List<Row> rows = jdbc.query("""
                SELECT o.id, o.name, o.city, o.travel_support_vnd, o.parking_fee_vnd,
                       COUNT(a.id) FILTER (WHERE a.status = 'DONATED') AS donated,
                       COUNT(a.travel_support_paid_vnd) AS paid,
                       COALESCE(SUM(a.travel_support_paid_vnd), 0) AS paid_total
                  FROM organizations o
                  LEFT JOIN donation_slots s ON s.organization_id = o.id
                  LEFT JOIN appointments a ON a.slot_id = s.id
                 WHERE o.verification_status = 'VERIFIED'
                 GROUP BY o.id, o.name, o.city, o.travel_support_vnd, o.parking_fee_vnd
                 ORDER BY paid_total DESC, o.name
                """, (rs, i) -> {
            long donated = rs.getLong("donated");
            long paid = rs.getLong("paid");
            return new Row(rs.getObject("id", UUID.class), rs.getString("name"), rs.getString("city"),
                    rs.getInt("travel_support_vnd"), rs.getObject("parking_fee_vnd", Integer.class),
                    donated, paid, Math.max(0, donated - paid), rs.getLong("paid_total"));
        });
        long donated = rows.stream().mapToLong(Row::donated).sum();
        long paid = rows.stream().mapToLong(Row::paid).sum();
        long total = rows.stream().mapToLong(Row::paidTotalVnd).sum();
        return new Report(rows, donated, paid, Math.max(0, donated - paid), total);
    }
}
