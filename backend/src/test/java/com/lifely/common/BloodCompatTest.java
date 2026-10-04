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
    void matrixHasExactly27Pairs() {
        long pairs = BloodCompat.ALL.stream()
                .flatMap(d -> BloodCompat.ALL.stream().filter(r -> BloodCompat.canDonate(d, r))).count();
        assertEquals(27, pairs);
    }
}
