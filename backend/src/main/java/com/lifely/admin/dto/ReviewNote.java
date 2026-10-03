package com.lifely.admin.dto;

import jakarta.validation.constraints.Size;

public record ReviewNote(@Size(max = 500) String note) {
}
