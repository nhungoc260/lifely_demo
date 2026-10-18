package com.lifely.request;

import com.lifely.matching.MatchingProperties;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * Ước lượng "độ phủ": có khoảng bao nhiêu donor phù hợp (đang sẵn sàng, tương thích, đã nghỉ đủ) quanh một điểm.
 * Chỉ trả về MỨC ĐỘ, và chỉ trả số cụ thể khi có từ 3 người trở lên (k-anonymity), để không thể dùng
 * endpoint này dò ra từng donor. Chỉ requester/tổ chức đã đăng nhập mới gọi được.
 */
@Service
public class CoverageService {

    /** 0 = toàn quốc (không giới hạn bán kính). */
    public static final int[] RADII_KM = {5, 10, 20, 50, 0};
    private static final int MIN_VISIBLE = 3;

    /** level: NONE | FEW | SOME | MANY. count chỉ có khi level là SOME hoặc MANY. */
    public record Ring(int radiusKm, String level, Integer count) {
    }

    private static final String SQL = """
            SELECT
              count(*) FILTER (WHERE dist <= 5)  AS within_5,
              count(*) FILTER (WHERE dist <= 10) AS within_10,
              count(*) FILTER (WHERE dist <= 20) AS within_20,
              count(*) FILTER (WHERE dist <= 50) AS within_50,
              count(*) AS within_all
            FROM (
              SELECT 6371.0088 * 2 * asin(sqrt(
                       power(sin(radians((:lat - d.latitude) / 2)), 2)
                       + cos(radians(d.latitude)) * cos(radians(:lat)) * power(sin(radians((:lng - d.longitude) / 2)), 2))) AS dist
              FROM donor_profiles d
              JOIN users u ON u.id = d.user_id AND u.status = 'ACTIVE'
              JOIN privacy_settings p ON p.user_id = d.user_id AND p.allow_emergency_matching
              WHERE d.availability_status = 'AVAILABLE'
                AND d.latitude IS NOT NULL AND d.longitude IS NOT NULL
                AND d.blood_type_id IN (SELECT c.donor_type_id FROM blood_compatibility c
                                        JOIN blood_types r ON r.id = c.recipient_type_id WHERE r.code = :bt)
                AND (d.last_donation_date IS NULL OR d.last_donation_date <= current_date - :minDays)
            ) x
            """;

    private final NamedParameterJdbcTemplate jdbc;
    private final MatchingProperties props;

    public CoverageService(NamedParameterJdbcTemplate jdbc, MatchingProperties props) {
        this.jdbc = jdbc;
        this.props = props;
    }

    @Transactional(readOnly = true)
    public List<Ring> coverage(String bloodType, double lat, double lng) {
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("lat", lat).addValue("lng", lng).addValue("bt", bloodType)
                .addValue("minDays", props.getMinDaysBetweenDonations());
        long[] counts = jdbc.queryForObject(SQL, params, (rs, i) ->
                new long[]{rs.getLong("within_5"), rs.getLong("within_10"), rs.getLong("within_20"), rs.getLong("within_50"), rs.getLong("within_all")});
        List<Ring> rings = new ArrayList<>();
        for (int i = 0; i < RADII_KM.length; i++) {
            long c = counts == null ? 0 : counts[i];
            String level = c == 0 ? "NONE" : c < MIN_VISIBLE ? "FEW" : c < 10 ? "SOME" : "MANY";
            rings.add(new Ring(RADII_KM[i], level, c >= MIN_VISIBLE ? (int) c : null));
        }
        return rings;
    }
}
