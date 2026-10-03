package com.lifely.donor.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record AddDonationRequest(@NotNull @PastOrPresent LocalDate donatedOn, @Size(max = 200) String location) {
}
