package com.lifely.organization;

import java.time.Instant;
import java.util.UUID;

/**
 * Một người hiến có liên quan đến cơ sở này (đã đặt lịch hoặc đã được cơ sở xác nhận hiến).
 * Không có vị trí; số điện thoại chỉ có khi người đó còn lịch hẹn đang hiệu lực tại cơ sở.
 */
public record OrgDonorEntry(UUID donorId, String fullName, String bloodType, int donations, int noShows,
                            int upcoming, Instant lastVisit, String phone) {
}
