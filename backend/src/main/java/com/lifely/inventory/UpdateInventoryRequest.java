package com.lifely.inventory;

import com.lifely.common.Patterns;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public record UpdateInventoryRequest(@NotEmpty @Size(max = 8) List<@Valid Entry> items) {

    public record Entry(
            @NotBlank @Pattern(regexp = Patterns.BLOOD_TYPE, message = "Nhóm máu không hợp lệ") String bloodType,
            @Min(0) @Max(100000) int units,
            @Min(0) @Max(100000) int lowThreshold) {
    }
}
