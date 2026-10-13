package com.lifely.organization;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Một lần hiến máu đã được tổ chức này xác nhận (không có số điện thoại hay vị trí của người hiến). */
public record DonationLogEntry(UUID id, LocalDate donatedOn, String donorName, String bloodType, String location,
                               String verificationLevel, Instant confirmedAt) {
}
