package com.lifely.matching;

import com.lifely.common.BloodCompat;
import com.lifely.common.GeoUtils;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;

/**
 * Công thức điểm điều phối (thuần tính toán, không phụ thuộc Spring/DB nên test được trực tiếp).
 * Trọng số: tương thích 40, khoảng cách 25, sẵn sàng 15, kịp deadline 10, độ gần lần hiến trước 10.
 * Điểm chỉ dùng để ưu tiên điều phối, KHÔNG phải quyết định y tế.
 */
public final class ScoreCalculator {

    /**
     * Thứ tự gọi người hiến: đúng nhóm máu luôn trước, trong cùng nhóm thì điểm cao trước.
     * Nhờ vậy nhóm đa năng (O-...) chỉ được gọi khi chưa đủ người đúng nhóm trong vòng tìm kiếm.
     */
    public static final Comparator<ScoreBreakdown> RANKING =
            Comparator.comparingInt((ScoreBreakdown s) -> s.exactType() ? 0 : 1)
                    .thenComparing(Comparator.comparingDouble(ScoreBreakdown::total).reversed());

    private ScoreCalculator() {
    }

    public static ScoreBreakdown score(String donorType, double donorLat, double donorLng, boolean available,
                                       LocalDate lastDonation, String requestType, double requestLat,
                                       double requestLng, Instant deadline, Instant now, LocalDate today,
                                       MatchingProperties props) {
        double distKm = GeoUtils.haversineKm(donorLat, donorLng, requestLat, requestLng);
        boolean exact = donorType.equals(requestType);
        double compat = BloodCompat.compatibilityScore(donorType, requestType);
        double dist = Math.max(0, 1 - distKm / props.getDistanceScoreRangeKm()) * 100;
        double avail = available ? 100 : 0;

        double minutesLeft = Duration.between(now, deadline).toSeconds() / 60.0;
        double minutesNeeded = TravelTimeEstimator.minutes(props, distKm, now) + props.getPrepMinutes();
        boolean feasible = minutesLeft >= minutesNeeded;
        double deadlineScore = feasible ? Math.min(1, (minutesLeft - minutesNeeded) / minutesNeeded) * 100 : 0;

        double recency = 100;
        if (lastDonation != null) {
            long days = ChronoUnit.DAYS.between(lastDonation, today);
            int min = props.getMinDaysBetweenDonations();
            recency = days >= 2L * min ? 100 : 60 + 40.0 * Math.max(0, days - min) / min;
        }
        double total = 0.40 * compat + 0.25 * dist + 0.15 * avail + 0.10 * deadlineScore + 0.10 * recency;
        return new ScoreBreakdown(GeoUtils.round2(total), GeoUtils.round2(compat), GeoUtils.round2(dist),
                GeoUtils.round2(avail), GeoUtils.round2(deadlineScore), GeoUtils.round2(recency), exact,
                GeoUtils.round2(distKm), feasible);
    }
}
