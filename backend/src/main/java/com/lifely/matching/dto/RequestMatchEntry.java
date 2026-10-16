package com.lifely.matching.dto;

import com.lifely.matching.ContactResult;
import com.lifely.matching.MatchStatus;

import java.time.Instant;
import java.util.UUID;

/** Góc nhìn của REQUESTER: ẩn danh cho tới khi donor chấp nhận. */
public record RequestMatchEntry(UUID matchId, String label, double distanceKm, double matchingScore,
                                MatchStatus status, Instant respondedAt, String donorName, String donorPhone,
                                boolean facilityVerified, String verifiedByName,
                                ContactResult contactResult, Instant contactResultAt) {
}
