package com.lifely.fuel;

import com.lifely.common.AppException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

/**
 * Giá xăng dùng cho ước tính chi phí đi lại. Hoàn toàn tự động: FuelPriceFetcher lấy giá từ các trang công bố nhiều lần mỗi ngày;
 * hệ thống giữ lịch sử, báo "cũ" khi lâu chưa lấy được và cảnh báo admin (không có nhập tay).
 */
@Service
public class FuelPriceService {

    private static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");
    /** Từ ngần này ngày chưa cập nhật thì coi là cũ (giao diện hiện cảnh báo). */
    public static final int STALE_AFTER_DAYS = 3;

    public record Entry(UUID id, LocalDate effectiveDate, int priceVnd, String label, String source, Instant createdAt,
                        boolean auto) {
    }

    /** Giá hiện hành cho người dùng: ageDays = số ngày kể từ ngày hiệu lực; stale = đã cũ. */
    public record Current(int priceVnd, LocalDate effectiveDate, String label, String source, long ageDays, boolean stale,
                          boolean auto) {
    }

    private static final RowMapper<Entry> MAPPER = (rs, i) -> new Entry(rs.getObject("id", UUID.class),
            rs.getDate("effective_date").toLocalDate(), rs.getInt("price_vnd"), rs.getString("label"),
            rs.getString("source"), rs.getTimestamp("created_at").toInstant(), rs.getBoolean("auto"));

    private final JdbcTemplate jdbc;

    public FuelPriceService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public Current current() {
        List<Entry> rows = jdbc.query("""
                SELECT id, effective_date, price_vnd, label, source, created_at, auto FROM fuel_prices
                 WHERE effective_date <= (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
                 ORDER BY effective_date DESC LIMIT 1
                """, MAPPER);
        if (rows.isEmpty()) {
            throw AppException.notFound("FUEL_PRICE_NOT_FOUND", "Chưa có dữ liệu giá xăng");
        }
        Entry e = rows.get(0);
        long age = Math.max(0, ChronoUnit.DAYS.between(e.effectiveDate(), LocalDate.now(VN)));
        return new Current(e.priceVnd(), e.effectiveDate(), e.label(), e.source(), age, age >= STALE_AFTER_DAYS, e.auto());
    }

    @Transactional(readOnly = true)
    public List<Entry> history(int limit) {
        return jdbc.query("""
                SELECT id, effective_date, price_vnd, label, source, created_at, auto FROM fuel_prices
                 ORDER BY effective_date DESC LIMIT ?
                """, MAPPER, Math.max(1, Math.min(limit, 60)));
    }

    /**
     * Lưu giá do hệ thống tự lấy cho một ngày (mỗi ngày một dòng; lấy lại trong ngày thì cập nhật dòng đó).
     * Không có đường nhập tay: giá luôn đến từ nguồn công bố.
     */
    @Transactional
    public void saveAuto(LocalDate effectiveDate, int priceVnd, String source) {
        String src = source != null && source.length() > 200 ? source.substring(0, 200) : source;
        jdbc.update("""
                INSERT INTO fuel_prices (effective_date, price_vnd, source, auto) VALUES (?, ?, ?, TRUE)
                ON CONFLICT (effective_date) DO UPDATE
                   SET price_vnd = EXCLUDED.price_vnd, source = EXCLUDED.source, created_at = now()
                """, java.sql.Date.valueOf(effectiveDate), priceVnd, src);
    }
}
