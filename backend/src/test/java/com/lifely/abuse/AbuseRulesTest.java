package com.lifely.abuse;

import com.lifely.abuse.AbuseRules.Severity;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Quy tắc phát hiện bất thường: chỉ tự dừng khi tín hiệu rất mạnh, còn lại để admin xem. */
class AbuseRulesTest {

    @Test
    void sharedPhoneAcrossThreeAccountsIsHigh() {
        assertNull(AbuseRules.phoneSharing(2));
        assertEquals(Severity.HIGH, AbuseRules.phoneSharing(3).severity());
    }

    @Test
    void requestBurstIsHighButFrequentIsOnlyMedium() {
        assertEquals(Severity.HIGH, AbuseRules.velocity(5, 5).severity());
        assertEquals(Severity.MEDIUM, AbuseRules.velocity(1, 3).severity());
        assertNull(AbuseRules.velocity(1, 2));
    }

    @Test
    void donationTooSoonUsesTwelveWeeks() {
        assertEquals(Severity.HIGH, AbuseRules.donationTooSoon(83).severity());
        assertNull(AbuseRules.donationTooSoon(84));
    }

    @Test
    void donatedBeforeStartIsHighAndTooFastIsMedium() {
        assertEquals(Severity.HIGH, AbuseRules.instantDonation(-1).severity());
        assertEquals(Severity.MEDIUM, AbuseRules.instantDonation(10).severity());
        assertNull(AbuseRules.instantDonation(20));
    }

    @Test
    void urgentCompletionTooSoonAfterAccept() {
        assertEquals(Severity.HIGH, AbuseRules.matchCompletedTooFast(3).severity());
        assertEquals(Severity.MEDIUM, AbuseRules.matchCompletedTooFast(10).severity());
        assertNull(AbuseRules.matchCompletedTooFast(45));
    }

    @Test
    void farHomeIsOnlyForReviewNeverBlocking() {
        assertNull(AbuseRules.homeFar(300));
        assertEquals(Severity.MEDIUM, AbuseRules.homeFar(301).severity());
    }

    @Test
    void supportLimitAndBurst() {
        assertNull(AbuseRules.supportOverLimit(50_000));
        assertNotNull(AbuseRules.supportOverLimit(50_001));
        assertNull(AbuseRules.orgBurst(19));
        assertNotNull(AbuseRules.orgBurst(20));
    }

    @Test
    void haversineMatchesKnownDistance() {
        assertEquals(0.0, AbuseRules.haversineKm(10, 106, 10, 106), 1e-9);
        double km = AbuseRules.haversineKm(10.7539, 106.6603, 10.7725, 106.698);
        assertTrue(km > 4 && km < 5);
    }
}
