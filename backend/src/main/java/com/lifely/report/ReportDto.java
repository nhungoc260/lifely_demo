package com.lifely.report;

import java.time.Instant;
import java.util.UUID;

public record ReportDto(UUID id, UUID reporterId, ReportTarget targetType, UUID targetId, ReportReason reason,
                        String description, ReportStatus status, Instant createdAt, Instant resolvedAt) {

    public static ReportDto from(Report r) {
        return new ReportDto(r.getId(), r.getReporterId(), r.getTargetType(), r.getTargetId(), r.getReason(),
                r.getDescription(), r.getStatus(), r.getCreatedAt(), r.getResolvedAt());
    }
}
