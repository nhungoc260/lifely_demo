package com.lifely.matching.dto;

import com.lifely.matching.ScoreBreakdown;

/** Giải thích vì sao request được ghép với donor (đặc tả mục 32). */
public record MatchExplanation(boolean bloodCompatible, boolean exactTypeMatch, double distanceKm, boolean available,
                               boolean deadlineFeasible, double compatibilityScore, double distanceScore,
                               double availabilityScore, double deadlineScore, double recencyScore,
                               String disclaimer) {

    public static final String DISCLAIMER = "Matching score is used only to prioritize coordination. "
            + "Final donation eligibility must be confirmed by healthcare professionals.";

    public static MatchExplanation from(ScoreBreakdown s, boolean available) {
        return new MatchExplanation(true, s.exactType(), s.distanceKm(), available, s.deadlineFeasible(),
                s.compatibility(), s.distance(), s.availability(), s.deadline(), s.recency(), DISCLAIMER);
    }
}
