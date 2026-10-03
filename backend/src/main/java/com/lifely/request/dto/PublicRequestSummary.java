package com.lifely.request.dto;

import com.lifely.request.BloodRequest;
import com.lifely.request.RequestStatus;
import com.lifely.request.Urgency;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Bản công khai: không có số điện thoại, không có thông tin người tạo hay bệnh nhân. */
public record PublicRequestSummary(UUID id, String bloodType, int unitsRequired, int unitsConfirmed,
                                   int unitsNeeded, Urgency urgency, RequestStatus status, String hospitalName,
                                   String city, String district, BigDecimal latitude, BigDecimal longitude,
                                   Instant deadline, Double distanceKm) {

    public static PublicRequestSummary from(BloodRequest r, Double distanceKm) {
        return new PublicRequestSummary(r.getId(), r.getBloodType().getCode(), r.getUnitsRequired(),
                r.getUnitsConfirmed(), r.unitsStillNeeded(), r.getUrgency(), r.getStatus(), r.getHospitalName(),
                r.getCity(), r.getDistrict(), r.getLatitude(), r.getLongitude(), r.getDeadline(), distanceKm);
    }
}
