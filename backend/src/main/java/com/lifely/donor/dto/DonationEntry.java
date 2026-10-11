package com.lifely.donor.dto;

import com.lifely.donor.DonationHistory;

import java.time.LocalDate;
import java.util.UUID;

public record DonationEntry(UUID id, LocalDate donatedOn, String location, String source,
                            String verificationLevel, String confirmedByOrganization) {

    public static DonationEntry from(DonationHistory h) {
        return new DonationEntry(h.getId(), h.getDonatedOn(), h.getLocation(), h.getSource(),
                h.getVerificationLevel(), h.getConfirmedByOrgName());
    }
}
