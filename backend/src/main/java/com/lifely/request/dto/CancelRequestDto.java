package com.lifely.request.dto;

import jakarta.validation.constraints.Size;

public record CancelRequestDto(@Size(max = 500) String reason) {
}
