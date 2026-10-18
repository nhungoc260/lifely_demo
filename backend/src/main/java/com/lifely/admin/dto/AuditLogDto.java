package com.lifely.admin.dto;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/** Một dòng nhật ký, kèm tên và email người thực hiện (null nếu hệ thống hoặc tài khoản đã bị xóa). */
public record AuditLogDto(UUID id, UUID userId, String userName, String userEmail, String action, String entityType,
                          UUID entityId, Map<String, Object> metadata, Instant createdAt) {
}
