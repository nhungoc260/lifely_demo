package com.lifely.admin.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Hồ sơ tóm tắt của một người dùng cho quản trị viên: đủ để liên hệ và xác minh khi có sự cố.
 * Chỉ có thành phố/quận, không có tọa độ chính xác.
 */
public record AdminUserOverview(UUID userId, String fullName, String email, String phone, String status, String avatarUrl,
                                Instant createdAt, Instant lastActivityAt, int requestsCreated,
                                int reportsAgainst, int openReportsAgainst, DonorInfo donor) {

    public record DonorInfo(String bloodType, String city, String district, String availability,
                            LocalDate lastDonationDate, int totalDonations, int verifiedDonations,
                            int matchesTotal, int matchesAccepted, int matchesCompleted,
                            int matchesRejected, int matchesExpired) {
    }
}
