package com.lifely.matching.dto;

import com.lifely.matching.MatchStatus;
import com.lifely.request.RequestStatus;
import com.lifely.request.Urgency;

import java.time.Instant;
import java.util.UUID;

/** Góc nhìn của DONOR về một request. Số điện thoại liên hệ chỉ hiện sau khi donor đã chấp nhận. */
public record DonorMatchResponse(UUID matchId, MatchStatus status, double matchingScore, double distanceKm,
                                 UUID requestId, String bloodType, int unitsNeeded, int unitsRequired,
                                 int unitsConfirmed, Urgency urgency, RequestStatus requestStatus,
                                 String hospitalName, String city, String district, Instant deadline,
                                 String description, String contactPhone, MatchExplanation explanation) {
}
