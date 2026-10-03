package com.lifely.matching;

import java.util.EnumSet;
import java.util.Set;

public enum MatchStatus {
    PENDING, CONTACTED, ACCEPTED, REJECTED, CANCELLED, COMPLETED, EXPIRED;

    /** Donor chưa phản hồi. */
    public static final Set<MatchStatus> AWAITING_RESPONSE = EnumSet.of(PENDING, CONTACTED);
    public static final Set<MatchStatus> NOT_FINAL = EnumSet.of(PENDING, CONTACTED, ACCEPTED);
}
