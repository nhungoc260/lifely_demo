package com.lifely.appointment;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Báo cáo hỗ trợ đi lại: mức mỗi cơ sở công bố và số lần hiến đã được ghi nhận chi hỗ trợ, gộp cả lịch hiến đặt trước
 * và yêu cầu máu khẩn cấp (tách riêng số liệu khẩn cấp). Chỉ là sổ ghi nhận do cơ sở tự khai; LIFELY không thu hay chuyển tiền.
 */
@Service
public class TravelSupportReportService {

    public record Row(UUID organizationId, String organizationName, String city, int policyVnd, Integer parkingFeeVnd,
                      long donated, long paid, long unpaid, long paidTotalVnd, long donatedUrgent, long paidUrgent) {
    }

    public record Report(List<Row> rows, long donated, long paid, long unpaid, long paidTotalVnd, long donatedUrgent,
                         long paidUrgent) {
    }

    /** Một tháng (giờ Việt Nam, định dạng yyyy-MM): số lượt đã ghi nhận và tổng tiền. */
    public record Month(String month, long paid, long totalVnd) {
    }

    /** Tổng hợp hỗ trợ đi lại của MỘT cơ sở, cho trang Thống kê của cơ sở. */
    public record OrgReport(int policyVnd, Integer parkingFeeVnd, long donated, long paid, long unpaid, long paidTotalVnd,
                            long donatedUrgent, long paidUrgent, List<Month> months) {
    }

    /**
     * Mọi lượt hiến có thể được hỗ trợ: lịch hẹn (urgent = false) và lượt hiến theo yêu cầu khẩn cấp gắn cơ sở (urgent = true).
     * Lượt khẩn cấp chỉ tính là "đã hiến" khi chính cơ sở đã xác nhận (ORG_VERIFIED), giống điều kiện được ghi nhận hỗ trợ.
     */
    private static final String EVENTS = """
            SELECT s.organization_id AS org_id, (a.status = 'DONATED') AS donated, a.travel_support_paid_vnd AS paid_vnd,
                   a.travel_support_paid_at AS paid_at, FALSE AS urgent
              FROM appointments a JOIN donation_slots s ON s.id = a.slot_id
            UNION ALL
            SELECT r.organization_id, (m.status = 'COMPLETED' AND EXISTS (
                       SELECT 1 FROM donation_history h WHERE h.match_id = m.id AND h.verification_level = 'ORG_VERIFIED')),
                   m.travel_support_paid_vnd, m.travel_support_paid_at, TRUE
              FROM matches m JOIN blood_requests r ON r.id = m.request_id
             WHERE r.organization_id IS NOT NULL
            """;

    private static final String ROW_SELECT = """
            SELECT o.id, o.name, o.city, o.travel_support_vnd, o.parking_fee_vnd,
                   COUNT(ev.org_id) FILTER (WHERE ev.donated) AS donated,
                   COUNT(ev.paid_vnd) AS paid,
                   COALESCE(SUM(ev.paid_vnd), 0) AS paid_total,
                   COUNT(ev.org_id) FILTER (WHERE ev.donated AND ev.urgent) AS donated_urgent,
                   COUNT(ev.paid_vnd) FILTER (WHERE ev.urgent) AS paid_urgent
              FROM organizations o LEFT JOIN ev ON ev.org_id = o.id
            """;

    private static final String ROW_GROUP = """
             GROUP BY o.id, o.name, o.city, o.travel_support_vnd, o.parking_fee_vnd
            """;

    private final JdbcTemplate jdbc;

    public TravelSupportReportService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static Row row(java.sql.ResultSet rs) throws java.sql.SQLException {
        long donated = rs.getLong("donated");
        long paid = rs.getLong("paid");
        return new Row(rs.getObject("id", UUID.class), rs.getString("name"), rs.getString("city"),
                rs.getInt("travel_support_vnd"), rs.getObject("parking_fee_vnd", Integer.class),
                donated, paid, Math.max(0, donated - paid), rs.getLong("paid_total"),
                rs.getLong("donated_urgent"), rs.getLong("paid_urgent"));
    }

    @Transactional(readOnly = true)
    public OrgReport forOrganization(UUID organizationId) {
        Row row = jdbc.queryForObject("WITH ev AS (" + EVENTS + ") " + ROW_SELECT + " WHERE o.id = ? " + ROW_GROUP,
                (rs, i) -> row(rs), organizationId);
        List<Month> months = jdbc.query("WITH ev AS (" + EVENTS + """
                )
                SELECT to_char(date_trunc('month', ev.paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM') AS ym,
                       COUNT(*) AS paid, SUM(ev.paid_vnd) AS total
                  FROM ev
                 WHERE ev.org_id = ? AND ev.paid_vnd IS NOT NULL AND ev.paid_at > now() - interval '6 months'
                 GROUP BY ym ORDER BY ym
                """, (rs, i) -> new Month(rs.getString("ym"), rs.getLong("paid"), rs.getLong("total")), organizationId);
        return new OrgReport(row.policyVnd(), row.parkingFeeVnd(), row.donated(), row.paid(), row.unpaid(),
                row.paidTotalVnd(), row.donatedUrgent(), row.paidUrgent(), months);
    }

    @Transactional(readOnly = true)
    public Report report() {
        List<Row> rows = jdbc.query("WITH ev AS (" + EVENTS + ") " + ROW_SELECT
                + " WHERE o.verification_status = 'VERIFIED' " + ROW_GROUP + " ORDER BY paid_total DESC, o.name",
                (rs, i) -> row(rs));
        long donated = rows.stream().mapToLong(Row::donated).sum();
        long paid = rows.stream().mapToLong(Row::paid).sum();
        long total = rows.stream().mapToLong(Row::paidTotalVnd).sum();
        long donatedUrgent = rows.stream().mapToLong(Row::donatedUrgent).sum();
        long paidUrgent = rows.stream().mapToLong(Row::paidUrgent).sum();
        return new Report(rows, donated, paid, Math.max(0, donated - paid), total, donatedUrgent, paidUrgent);
    }
}
