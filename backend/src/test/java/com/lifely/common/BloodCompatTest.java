package com.lifely.common;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class BloodCompatTest {

    @Test
    void oNegativeIsUniversalDonor() {
        for (String recipient : BloodCompat.ALL) {
            assertTrue(BloodCompat.canDonate("O-", recipient), "O- should donate to " + recipient);
        }
    }

    @Test
    void abPositiveReceivesFromEveryone() {
        assertEquals(8, BloodCompat.compatibleDonorTypes("AB+").size());
    }

    @Test
    void rhPositiveCannotDonateToRhNegative() {
        assertFalse(BloodCompat.canDonate("O+", "O-"));
        assertFalse(BloodCompat.canDonate("A+", "A-"));
    }

    @Test
    void aboRulesAreRespected() {
        assertFalse(BloodCompat.canDonate("A+", "B+"));
        assertFalse(BloodCompat.canDonate("AB+", "A+"));
        assertTrue(BloodCompat.canDonate("A-", "AB+"));
        assertEquals(List.of("O-"), BloodCompat.compatibleDonorTypes("O-"));
    }

    @Test
    void recipientCountsMatchTheCompatibilityMatrix() {
        assertEquals(8, BloodCompat.recipientCount("O-"));
        assertEquals(4, BloodCompat.recipientCount("O+"));
        assertEquals(4, BloodCompat.recipientCount("A-"));
        assertEquals(2, BloodCompat.recipientCount("A+"));
        assertEquals(1, BloodCompat.recipientCount("AB+"));
    }

    @Test
    void exactTypeAlwaysScoresHundredAndIncompatibleScoresZero() {
        for (String t : BloodCompat.ALL) {
            assertEquals(100.0, BloodCompat.compatibilityScore(t, t));
        }
        assertEquals(0.0, BloodCompat.compatibilityScore("A+", "B+"));
        assertEquals(0.0, BloodCompat.compatibilityScore("O+", "O-"));
    }

    @Test
    void universalDonorsAreReservedForLast() {
        // Cùng cần máu AB+: A+ (hiến được 2 nhóm) > O+ (4 nhóm) > O- (8 nhóm)
        double a = BloodCompat.compatibilityScore("A+", "AB+");
        double o = BloodCompat.compatibilityScore("O+", "AB+");
        double oNeg = BloodCompat.compatibilityScore("O-", "AB+");
        assertTrue(a > o && o > oNeg, a + " > " + o + " > " + oNeg);
        assertEquals(65.0, oNeg, 0.001);
        assertTrue(oNeg < 100.0 && a < 100.0);
    }

    @Test
    void anyCompatibleNonExactScoreStaysBetweenZeroAndExact() {
        for (String d : BloodCompat.ALL) {
            for (String r : BloodCompat.ALL) {
                if (d.equals(r) || !BloodCompat.canDonate(d, r)) {
                    continue;
                }
                double s = BloodCompat.compatibilityScore(d, r);
                assertTrue(s >= 65.0 && s < 100.0, d + "->" + r + " = " + s);
            }
        }
    }

    @Test
    void matrixHasExactly27Pairs() {
        long pairs = BloodCompat.ALL.stream()
                .flatMap(d -> BloodCompat.ALL.stream().filter(r -> BloodCompat.canDonate(d, r))).count();
        assertEquals(27, pairs);
    }
}
