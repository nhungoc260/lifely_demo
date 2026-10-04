package com.lifely.contact;

import com.lifely.common.Patterns;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ContactRequest(
        @NotBlank @Size(min = 2, max = 150) String name,
        @NotBlank @Email @Size(max = 255) String email,
        @Pattern(regexp = "^$|" + Patterns.PHONE, message = "Enter a valid Vietnamese phone number") String phone,
        @NotBlank @Size(min = 10, max = 2000, message = "Please write between 10 and 2000 characters") String message) {
}
