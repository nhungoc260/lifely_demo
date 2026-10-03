package com.lifely.donor.dto;

import com.lifely.donor.AvailabilityStatus;
import com.lifely.donor.DonorProfile;
import com.lifely.user.User;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** Dữ liệu hồ sơ dành cho CHÍNH chủ tài khoản. Tọa độ chính xác không bao giờ xuất hiện trong API công khai. */
public record DonorProfileResponse(UUID id, String fullName, String phone, String avatarUrl, String bloodType,
                                   String city, String district, String approximateArea,
                                   BigDecimal latitude, BigDecimal longitude, LocalDate lastDonationDate,
                                   AvailabilityStatus availability, int totalDonations, boolean profileComplete) {

    public static DonorProfileResponse from(DonorProfile d, User u) {
        String area = d.getDistrict() == null ? d.getCity()
                : d.getCity() == null ? d.getDistrict() : d.getDistrict() + ", " + d.getCity();
        boolean complete = d.getBloodType() != null && d.hasLocation();
        return new DonorProfileResponse(d.getId(), u.getFullName(), u.getPhone(), u.getAvatarUrl(),
                d.getBloodType() == null ? null : d.getBloodType().getCode(), d.getCity(), d.getDistrict(), area,
                d.getLatitude(), d.getLongitude(), d.getLastDonationDate(), d.getAvailabilityStatus(),
                d.getTotalDonations(), complete);
    }
}
