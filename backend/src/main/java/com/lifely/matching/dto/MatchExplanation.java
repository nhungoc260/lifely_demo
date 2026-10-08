package com.lifely.matching.dto;

import com.lifely.matching.ScoreBreakdown;

/** Giải thích vì sao request được ghép với donor (đặc tả mục 32). */
public record MatchExplanation(boolean bloodCompatible, boolean exactTypeMatch, double distanceKm, boolean available,
                               boolean deadlineFeasible, double compatibilityScore, double distanceScore,
                               double availabilityScore, double deadlineScore, double recencyScore,
                               String disclaimer) {

    public static final String DISCLAIMER = "Điểm kết nối chỉ dùng để ưu tiên điều phối. "
            + "Điều kiện hiến máu cuối cùng phải do nhân viên y tế xác nhận.";

    public static MatchExplanation from(ScoreBreakdown s, boolean available) {
        return new MatchExplanation(true, s.exactType(), s.distanceKm(), available, s.deadlineFeasible(),
                s.compatibility(), s.distance(), s.availability(), s.deadline(), s.recency(), DISCLAIMER);
    }
}
