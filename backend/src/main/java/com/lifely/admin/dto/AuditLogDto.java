package com.lifely.admin.dto;

import com.lifely.audit.AuditLog;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record AuditLogDto(UUID id, UUID userId, String action, String entityType, UUID entityId,
                          Map<String, Object> metadata, Instant createdAt) {

    public static AuditLogDto from(AuditLog a) {
        return new AuditLogDto(a.getId(), a.getUserId(), a.getAction(), a.getEntityType(), a.getEntityId(),
                a.getMetadata(), a.getCreatedAt());
    }
}
