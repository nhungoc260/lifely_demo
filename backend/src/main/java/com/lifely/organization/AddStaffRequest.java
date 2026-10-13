package com.lifely.organization;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AddStaffRequest(@NotBlank @Email @Size(max = 255) String email) {
}
