package com.lifely.donor;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class VerificationLevelTest {

    @Test
    void trustIncreasesFromSelfReportedToFacilityVerified() {
        assertTrue(VerificationLevel.REQUESTER_CONFIRMED.isHigherThan(VerificationLevel.SELF_REPORTED));
        assertTrue(VerificationLevel.ORG_VERIFIED.isHigherThan(VerificationLevel.REQUESTER_CONFIRMED));
        assertFalse(VerificationLevel.SELF_REPORTED.isHigherThan(VerificationLevel.ORG_VERIFIED));
        assertFalse(VerificationLevel.ORG_VERIFIED.isHigherThan(VerificationLevel.ORG_VERIFIED));
    }

    @Test
    void parseFallsBackToTheLowestLevelForUnknownValues() {
        assertEquals(VerificationLevel.ORG_VERIFIED, VerificationLevel.parse("ORG_VERIFIED"));
        assertEquals(VerificationLevel.SELF_REPORTED, VerificationLevel.parse(null));
        assertEquals(VerificationLevel.SELF_REPORTED, VerificationLevel.parse("DOCTOR_APPROVED"));
    }
}
