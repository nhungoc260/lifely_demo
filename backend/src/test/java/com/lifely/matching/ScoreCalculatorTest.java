package com.lifely.matching;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test công thức điểm điều phối (40/25/15/10/10) và thứ tự gọi người hiến, không cần DB/Spring.
 * Nơi cần máu: Quận 1 (10.7769, 106.7009).
 */
class ScoreCalculatorTest {

    private static final double REQ_LAT = 10.7769;
    private static final double REQ_LNG = 106.7009;
    private static final Instant OFF_PEAK = Instant.parse("2027-01-04T07:00:00Z");   // 14:00 thứ Hai
    private static final Instant PEAK = Instant.parse("2027-01-04T01:00:00Z");       // 08:00 thứ Hai
    private static final LocalDate TODAY = LocalDate.of(2027, 1, 4);
    private final MatchingProperties props = new MatchingProperties();

    private ScoreBreakdown score(String donorType, double lat, double lng, String requestType,
                                 Instant now, long deadlineMinutes, LocalDate last) {
        return ScoreCalculator.score(donorType, lat, lng, true, last, requestType, REQ_LAT, REQ_LNG,
                now.plus(deadlineMinutes, ChronoUnit.MINUTES), now, TODAY, props);
    }

    @Test
    void sameTypeAtTheHospitalScoresPerfect() {
        ScoreBreakdown s = score("O+", REQ_LAT, REQ_LNG, "O+", OFF_PEAK, 24 * 60, null);
        assertTrue(s.exactType());
        assertEquals(100.0, s.total());
    }

    @Test
    void universalDonorForAnotherTypeLosesTheMostCompatibilityPoints() {
        ScoreBreakdown exact = score("O+", REQ_LAT, REQ_LNG, "O+", OFF_PEAK, 24 * 60, null);
        ScoreBreakdown oNeg = score("O-", REQ_LAT, REQ_LNG, "O+", OFF_PEAK, 24 * 60, null);
        assertFalse(oNeg.exactType());
        assertEquals(65.0, oNeg.compatibility());
        assertEquals(14.0, exact.total() - oNeg.total(), 0.01);   // 40% * 35 điểm
    }

    @Test
    void lessVersatileCompatibleDonorOutscoresMoreVersatileOne() {
        // Cần máu AB+, cùng vị trí: A+ phải được ưu tiên hơn O+ và O-
        double a = score("A+", REQ_LAT, REQ_LNG, "AB+", OFF_PEAK, 24 * 60, null).total();
        double o = score("O+", REQ_LAT, REQ_LNG, "AB+", OFF_PEAK, 24 * 60, null).total();
        double oNeg = score("O-", REQ_LAT, REQ_LNG, "AB+", OFF_PEAK, 24 * 60, null).total();
        assertTrue(a > o && o > oNeg, a + " > " + o + " > " + oNeg);
    }

    @Test
    void exactTypeIsContactedBeforeAnyCompatibleDonorEvenIfFarther() {
        ScoreBreakdown nearUniversal = score("O-", REQ_LAT, REQ_LNG, "A+", OFF_PEAK, 24 * 60, null);       // 0 km
        ScoreBreakdown farExact = score("A+", REQ_LAT + 0.18, REQ_LNG, "A+", OFF_PEAK, 24 * 60, null);     // ~20 km
        // dù người O- ở sát bên, người đúng nhóm vẫn đứng trước để dành O- cho ca thật sự cần
        List<ScoreBreakdown> list = new ArrayList<>(List.of(nearUniversal, farExact));
        list.sort(ScoreCalculator.RANKING);
        assertTrue(list.get(0).exactType());
        assertFalse(list.get(1).exactType());
    }

    @Test
    void withinTheSameGroupHigherScoreComesFirst() {
        ScoreBreakdown near = score("A+", REQ_LAT + 0.01, REQ_LNG, "A+", OFF_PEAK, 24 * 60, null);
        ScoreBreakdown far = score("A+", REQ_LAT + 0.10, REQ_LNG, "A+", OFF_PEAK, 24 * 60, null);
        List<ScoreBreakdown> list = new ArrayList<>(List.of(far, near));
        list.sort(ScoreCalculator.RANKING);
        assertEquals(near.distanceKm(), list.get(0).distanceKm());
    }

    @Test
    void closerDonorsScoreHigher() {
        ScoreBreakdown near = score("O+", 10.78, 106.70, "O+", OFF_PEAK, 24 * 60, null);
        ScoreBreakdown far = score("O+", 10.90, 106.80, "O+", OFF_PEAK, 24 * 60, null);
        assertTrue(near.total() > far.total());
        assertTrue(near.distanceKm() < far.distanceKm());
    }

    @Test
    void sameDonorIsFeasibleOffPeakButNotInRushHour() {
        // ~10 km, còn 80 phút: ngoài giờ cao điểm cần ~62 phút (kịp), giờ cao điểm cần ~84 phút (không kịp)
        double lat = REQ_LAT + 0.09;
        ScoreBreakdown offPeak = score("O+", lat, REQ_LNG, "O+", OFF_PEAK, 80, null);
        ScoreBreakdown rush = score("O+", lat, REQ_LNG, "O+", PEAK, 80, null);
        assertTrue(offPeak.deadlineFeasible());
        assertFalse(rush.deadlineFeasible());
        assertEquals(0.0, rush.deadline());
    }

    @Test
    void realRoadDistanceMakesFarDonorsInfeasibleSooner() {
        // 30 km chim bay, còn 1 giờ: cần ~97 phút di chuyển + 30 phút chuẩn bị
        ScoreBreakdown s = score("O+", 11.05, 106.70, "O+", OFF_PEAK, 60, null);
        assertFalse(s.deadlineFeasible());
    }

    @Test
    void recentDonationLowersRecencyScore() {
        ScoreBreakdown rested = score("O+", REQ_LAT, REQ_LNG, "O+", OFF_PEAK, 24 * 60, TODAY.minusDays(400));
        ScoreBreakdown recent = score("O+", REQ_LAT, REQ_LNG, "O+", OFF_PEAK, 24 * 60, TODAY.minusDays(85));
        assertEquals(100.0, rested.recency());
        assertTrue(recent.recency() < rested.recency());
    }

    @Test
    void totalIsAlwaysWithinZeroAndHundred() {
        ScoreBreakdown worst = score("O-", 11.5, 107.5, "AB+", PEAK, 60, TODAY.minusDays(84));
        ScoreBreakdown best = score("AB+", REQ_LAT, REQ_LNG, "AB+", OFF_PEAK, 24 * 60, null);
        assertTrue(worst.total() >= 0 && worst.total() <= 100);
        assertTrue(best.total() >= 0 && best.total() <= 100);
    }
}
