package com.lifely.request.dto;

import com.lifely.request.BloodRequest;
import com.lifely.request.RequestStatus;
import com.lifely.request.Urgency;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Dành cho chủ yêu cầu, chủ tổ chức và admin. */
public record RequestResponse(UUID id, String bloodType, int unitsRequired, int unitsConfirmed, Urgency urgency,
                              RequestStatus status, String hospitalName, String city, String district,
                              BigDecimal latitude, BigDecimal longitude, Instant deadline, String contactPhone,
                              String description, boolean verified, int escalationLevel, UUID organizationId,
                              String cancelReason, Instant createdAt, Instant updatedAt) {

    public static RequestResponse from(BloodRequest r) {
        return new RequestResponse(r.getId(), r.getBloodType().getCode(), r.getUnitsRequired(),
                r.getUnitsConfirmed(), r.getUrgency(), r.getStatus(), r.getHospitalName(), r.getCity(),
                r.getDistrict(), r.getLatitude(), r.getLongitude(), r.getDeadline(), r.getContactPhone(),
                r.getDescription(), r.isVerified(), r.getEscalationLevel(), r.getOrganizationId(),
                r.getCancelReason(), r.getCreatedAt(), r.getUpdatedAt());
    }
}
