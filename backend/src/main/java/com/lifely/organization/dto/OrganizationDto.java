package com.lifely.organization.dto;

import com.lifely.organization.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record OrganizationDto(UUID id, String name, OrgType type, String address, String city, String district,
                              BigDecimal latitude, BigDecimal longitude, String phone, String email,
                              String contactPerson, OrgVerificationStatus verificationStatus,
                              String verificationNote, Instant verifiedAt, List<DocumentDto> documents) {

    public record DocumentDto(UUID id, String docType, String fileName, Instant uploadedAt) {
        public static DocumentDto from(OrganizationDocument d) {
            return new DocumentDto(d.getId(), d.getDocType(), d.getFileName(), d.getUploadedAt());
        }
    }

    public static OrganizationDto from(Organization o, List<OrganizationDocument> docs) {
        return new OrganizationDto(o.getId(), o.getName(), o.getType(), o.getAddress(), o.getCity(), o.getDistrict(),
                o.getLatitude(), o.getLongitude(), o.getPhone(), o.getEmail(), o.getContactPerson(),
                o.getVerificationStatus(), o.getVerificationNote(), o.getVerifiedAt(),
                docs.stream().map(DocumentDto::from).toList());
    }
}
