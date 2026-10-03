package com.lifely.donor.dto;

import com.lifely.donor.AvailabilityStatus;

public record DonorDashboardResponse(String fullName, String bloodType, AvailabilityStatus availability,
                                     long nearbyRequests, int confirmedDonations, long unreadNotifications,
                                     boolean profileComplete) {
}
