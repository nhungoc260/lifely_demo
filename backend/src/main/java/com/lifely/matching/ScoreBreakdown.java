package com.lifely.matching;

/** Điểm thành phần 0-100 và tổng điểm có trọng số 40/25/15/10/10. */
public record ScoreBreakdown(double total, double compatibility, double distance, double availability,
                             double deadline, double recency, boolean exactType, double distanceKm,
                             boolean deadlineFeasible) {
}
