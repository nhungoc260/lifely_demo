package com.lifely.request.dto;

import com.lifely.common.Patterns;
import com.lifely.request.Urgency;
import jakarta.validation.constraints.*;

import java.time.Instant;
import java.util.UUID;

public record CreateRequestDto(
        @NotBlank @Pattern(regexp = Patterns.BLOOD_TYPE, message = "Chọn nhóm máu hợp lệ") String bloodType,
        @Min(1) @Max(20) int unitsRequired,
        @NotBlank @Size(max = 200) String hospitalName,
        @NotBlank @Size(max = 100) String city,
        @Size(max = 100) String district,
        @NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
        @NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude,
        @NotNull Urgency urgency,
        @NotNull Instant deadline,
        @NotBlank @Pattern(regexp = Patterns.PHONE, message = "Số điện thoại không hợp lệ") String contactPhone,
        @Size(max = 1000) String description,
        UUID organizationId) {
}
