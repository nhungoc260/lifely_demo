package com.lifely.auth.dto;

import com.lifely.common.Patterns;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Size(min = 2, max = 150) String fullName,
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Pattern(regexp = Patterns.PHONE, message = "Enter a valid Vietnamese phone number") String phone,
        @NotBlank @Pattern(regexp = Patterns.PASSWORD,
                message = "Use 8+ characters with upper case, lower case and a number") String password,
        @NotBlank String confirmPassword,
        @NotBlank @Pattern(regexp = "DONOR|REQUESTER|ORGANIZATION", message = "Role must be DONOR, REQUESTER or ORGANIZATION") String role) {
}
