package com.lifely.donor.dto;

import com.lifely.user.PrivacySettings;

public record PrivacyDto(boolean showApproximateLocation, boolean allowEmergencyMatching,
                         boolean receiveEmergencyNotifications, boolean showDonationCount) {

    public static PrivacyDto from(PrivacySettings p) {
        return new PrivacyDto(p.isShowApproximateLocation(), p.isAllowEmergencyMatching(),
                p.isReceiveEmergencyNotifications(), p.isShowDonationCount());
    }
}
