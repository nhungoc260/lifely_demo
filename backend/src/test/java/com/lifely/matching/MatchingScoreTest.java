package com.lifely.matching;

import com.lifely.donor.AvailabilityStatus;
import com.lifely.donor.BloodType;
import com.lifely.donor.DonorProfile;
import com.lifely.request.BloodRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

/** Kiểm tra công thức điểm 40/25/15/10/10 mà không cần DB (các dependency được mock). */
class MatchingScoreTest {

    private MatchingService service;
    private final Instant now = Instant.parse("2027-01-01T08:00:00Z");

    @BeforeEach
    void setUp() {
        service = new MatchingService(mock(com.lifely.donor.DonorProfileRepository.class),
                mock(com.lifely.donor.BloodTypeRepository.class), mock(MatchRepository.class),
                mock(MatchEventRepository.class), mock(com.lifely.user.PrivacySettingsRepository.class),
                mock(com.lifely.request.RequestLifecycle.class), mock(com.lifely.request.BloodRequestRepository.class),
                mock(com.lifely.notification.NotificationService.class), new MatchingProperties());
    }

    private static BloodType type(String code) {
        BloodType t = new BloodType();
        t.setCode(code);
        return t;
    }

    private DonorProfile donor(String type, double lat, double lng, LocalDate last) {
        DonorProfile d = new DonorProfile();
        d.setBloodType(type(type));
        d.setLatitude(BigDecimal.valueOf(lat));
        d.setLongitude(BigDecimal.valueOf(lng));
        d.setLastDonationDate(last);
        d.setAvailabilityStatus(AvailabilityStatus.AVAILABLE);
        return d;
    }

    private BloodRequest request(String type, long deadlineHours) {
        BloodRequest r = new BloodRequest();
        r.setBloodType(type(type));
        r.setLatitude(BigDecimal.valueOf(10.7769));
        r.setLongitude(BigDecimal.valueOf(106.7009));
        r.setDeadline(now.plus(deadlineHours, ChronoUnit.HOURS));
        return r;
    }

    @Test
    void sameTypeAtTheHospitalScoresNearPerfect() {
        ScoreBreakdown s = service.score(donor("O+", 10.7769, 106.7009, null), request("O+", 24), now);
        assertTrue(s.exactType());
        assertEquals(100.0, s.compatibility());
        assertEquals(100.0, s.distance());
        assertEquals(100.0, s.total());
    }

    @Test
    void compatibleButDifferentTypeScoresLowerOnCompatibilityOnly() {
        ScoreBreakdown exact = service.score(donor("O+", 10.7769, 106.7009, null), request("O+", 24), now);
        ScoreBreakdown other = service.score(donor("O-", 10.7769, 106.7009, null), request("O+", 24), now);
        assertFalse(other.exactType());
        assertEquals(65.0, other.compatibility());                // O- hiến được 8 nhóm nên bị trừ nhiều nhất
        assertEquals(14.0, exact.total() - other.total(), 0.01);  // 40% * 35 điểm
    }

    @Test
    void closerDonorsScoreHigher() {
        BloodRequest r = request("O+", 24);
        ScoreBreakdown near = service.score(donor("O+", 10.78, 106.70, null), r, now);
        ScoreBreakdown far = service.score(donor("O+", 10.90, 106.80, null), r, now);
        assertTrue(near.total() > far.total());
        assertTrue(near.distanceKm() < far.distanceKm());
    }

    @Test
    void donorWhoCannotArriveBeforeDeadlineIsInfeasible() {
        // Cách ~30 km, deadline sau 1 giờ: cần ~72 phút di chuyển + 30 phút chuẩn bị
        ScoreBreakdown s = service.score(donor("O+", 11.05, 106.70, null), request("O+", 1), now);
        assertFalse(s.deadlineFeasible());
        assertEquals(0.0, s.deadline());
    }

    @Test
    void recentDonationLowersRecencyScore() {
        BloodRequest r = request("O+", 24);
        ScoreBreakdown rested = service.score(donor("O+", 10.7769, 106.7009, LocalDate.now().minusDays(400)), r, now);
        ScoreBreakdown recent = service.score(donor("O+", 10.7769, 106.7009, LocalDate.now().minusDays(85)), r, now);
        assertEquals(100.0, rested.recency());
        assertTrue(recent.recency() < rested.recency());
    }

    @Test
    void totalIsAlwaysWithinZeroAndHundred() {
        ScoreBreakdown s = service.score(donor("O-", 11.5, 107.5, LocalDate.now().minusDays(84)), request("AB+", 1), now);
        assertTrue(s.total() >= 0 && s.total() <= 100);
    }
}
