package com.lifely.auth.dto;

import com.lifely.common.Patterns;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Hoàn tất hồ sơ sau khi xác thực Google lần đầu: Google chỉ cho biết email và tên,
 * nên vai trò và số điện thoại phải do người dùng cung cấp. fullName để trống thì dùng tên từ Google.
 */
public record GoogleRegisterRequest(
        @NotBlank @Size(max = 4096) String credential,
        @Size(min = 2, max = 150) String fullName,
        @NotBlank @Pattern(regexp = Patterns.PHONE, message = "Số điện thoại không hợp lệ") String phone,
        @NotBlank @Pattern(regexp = "DONOR|REQUESTER|ORGANIZATION", message = "Vai trò phải là DONOR, REQUESTER hoặc ORGANIZATION") String role) {
}
