package com.lifely.auth.dto;

import com.lifely.common.Patterns;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ResetPasswordRequest(
        @NotBlank String token,
        @NotBlank @Pattern(regexp = Patterns.PASSWORD,
                message = "Dùng từ 8 ký tự, gồm chữ hoa, chữ thường và số") String password) {
}
