package com.lifely.organization.dto;

import com.lifely.common.Patterns;
import com.lifely.organization.OrgType;
import jakarta.validation.constraints.*;

public record UpdateOrganizationRequest(
        @NotBlank @Size(max = 200) String name,
        @NotNull OrgType type,
        @NotBlank @Size(max = 300) String address,
        @NotBlank @Size(max = 100) String city,
        @Size(max = 100) String district,
        @NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
        @NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude,
        @NotBlank @Pattern(regexp = Patterns.PHONE, message = "Số điện thoại không hợp lệ") String phone,
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(max = 150) String contactPerson) {
}
