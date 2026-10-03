package com.lifely.donor.dto;

import com.lifely.donor.AvailabilityStatus;
import jakarta.validation.constraints.NotNull;

public record AvailabilityRequest(@NotNull AvailabilityStatus availability) {
}
