package com.lifely.matching;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Kiểm tra ước lượng thời gian di chuyển theo giờ trong ngày (giờ Việt Nam = UTC+7). Không cần DB. */
class TravelTimeEstimatorTest {

    private final MatchingProperties props = new MatchingProperties();

    @Test
    void weekdayMorningPeakIsSlowest() {
        Instant mondayEightAm = Instant.parse("2027-01-04T01:00:00Z");   // 08:00 thứ Hai
        assertEquals(15.0, TravelTimeEstimator.speedKmh(props, mondayEightAm));
    }

    @Test
    void weekdayEveningPeakIsSlow() {
        Instant mondaySixPm = Instant.parse("2027-01-04T11:00:00Z");     // 18:00 thứ Hai
        assertEquals(15.0, TravelTimeEstimator.speedKmh(props, mondaySixPm));
    }

    @Test
    void middayIsNormalSpeed() {
        Instant mondayTwoPm = Instant.parse("2027-01-04T07:00:00Z");     // 14:00 thứ Hai
        assertEquals(25.0, TravelTimeEstimator.speedKmh(props, mondayTwoPm));
    }

    @Test
    void weekendHasNoRushHour() {
        Instant sundaySixPm = Instant.parse("2027-01-03T11:00:00Z");     // 18:00 Chủ nhật
        assertEquals(25.0, TravelTimeEstimator.speedKmh(props, sundaySixPm));
    }

    @Test
    void nightIsFastestAndWrapsPastMidnight() {
        assertEquals(35.0, TravelTimeEstimator.speedKmh(props, Instant.parse("2027-01-04T16:00:00Z")));  // 23:00
        assertEquals(35.0, TravelTimeEstimator.speedKmh(props, Instant.parse("2027-01-04T19:00:00Z")));  // 02:00 hôm sau
        assertEquals(25.0, TravelTimeEstimator.speedKmh(props, Instant.parse("2027-01-04T22:30:00Z")));  // 05:30: hết đêm, chưa cao điểm
    }

    @Test
    void minutesUseRoadFactorAndSpeed() {
        // 10 km chim bay -> 13.5 km đường thực tế
        assertEquals(32.4, TravelTimeEstimator.minutes(props, 10, Instant.parse("2027-01-04T07:00:00Z")), 0.01);
        assertEquals(54.0, TravelTimeEstimator.minutes(props, 10, Instant.parse("2027-01-04T01:00:00Z")), 0.01);
        assertEquals(23.14, TravelTimeEstimator.minutes(props, 10, Instant.parse("2027-01-04T16:00:00Z")), 0.01);
    }

    @Test
    void zeroDistanceTakesZeroTime() {
        assertEquals(0.0, TravelTimeEstimator.minutes(props, 0, Instant.parse("2027-01-04T01:00:00Z")), 0.0001);
    }

    @Test
    void rushHourIsAlwaysSlowerThanOffPeakForTheSameTrip() {
        double peak = TravelTimeEstimator.minutes(props, 7, Instant.parse("2027-01-04T01:00:00Z"));
        double normal = TravelTimeEstimator.minutes(props, 7, Instant.parse("2027-01-04T07:00:00Z"));
        assertTrue(peak > normal);
    }
}
