package com.lifely.donor.dto;

import com.lifely.common.Patterns;
import jakarta.validation.constraints.*;

import java.time.LocalDate;

/** Các trường null nghĩa là "không đổi", để wizard onboarding lưu từng bước. */
public record UpdateDonorProfileRequest(
        @Size(min = 2, max = 150) String fullName,
        @Pattern(regexp = Patterns.PHONE, message = "Enter a valid Vietnamese phone number") String phone,
        @Size(max = 500) String avatarUrl,
        @Pattern(regexp = Patterns.BLOOD_TYPE, message = "Blood type must be A, B, AB or O with + or -") String bloodType,
        @Size(max = 100) String city,
        @Size(max = 100) String district,
        @DecimalMin("-90") @DecimalMax("90") Double latitude,
        @DecimalMin("-180") @DecimalMax("180") Double longitude,
        @PastOrPresent LocalDate lastDonationDate) {
}
