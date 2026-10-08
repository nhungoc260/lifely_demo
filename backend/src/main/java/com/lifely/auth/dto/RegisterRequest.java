package com.lifely.auth.dto;

import com.lifely.common.Patterns;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Size(min = 2, max = 150) String fullName,
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Pattern(regexp = Patterns.PHONE, message = "Số điện thoại không hợp lệ") String phone,
        @NotBlank @Pattern(regexp = Patterns.PASSWORD,
                message = "Dùng từ 8 ký tự, gồm chữ hoa, chữ thường và số") String password,
        @NotBlank String confirmPassword,
        @NotBlank @Pattern(regexp = "DONOR|REQUESTER|ORGANIZATION", message = "Vai trò phải là DONOR, REQUESTER hoặc ORGANIZATION") String role) {
}
