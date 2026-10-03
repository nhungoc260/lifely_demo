package com.lifely.request;

import java.util.EnumSet;
import java.util.Set;

public enum RequestStatus {
    CREATED, PENDING_VERIFICATION, VERIFIED, MATCHING, DONORS_CONTACTED,
    PARTIALLY_FULFILLED, FULFILLED, CANCELLED, EXPIRED;

    /** Đã xác minh và đang điều phối: hiển thị công khai, được match và được leo thang. */
    public static final Set<RequestStatus> ACTIVE =
            EnumSet.of(VERIFIED, MATCHING, DONORS_CONTACTED, PARTIALLY_FULFILLED);

    /** Còn có thể hủy. */
    public static final Set<RequestStatus> CANCELLABLE =
            EnumSet.of(CREATED, PENDING_VERIFICATION, VERIFIED, MATCHING, DONORS_CONTACTED, PARTIALLY_FULFILLED);

    public static final Set<RequestStatus> AWAITING_OR_ACTIVE =
            EnumSet.of(CREATED, PENDING_VERIFICATION, VERIFIED, MATCHING, DONORS_CONTACTED, PARTIALLY_FULFILLED);

    public boolean isActive() {
        return ACTIVE.contains(this);
    }
}
