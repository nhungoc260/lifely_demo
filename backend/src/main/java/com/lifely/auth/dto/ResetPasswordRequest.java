package com.lifely.auth.dto;

import com.lifely.common.Patterns;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ResetPasswordRequest(
        @NotBlank String token,
        @NotBlank @Pattern(regexp = Patterns.PASSWORD,
                message = "Use 8+ characters with upper case, lower case and a number") String password) {
}
