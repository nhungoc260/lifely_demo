package com.lifely.audit;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Service
public class AuditService {

    private final AuditLogRepository repository;

    public AuditService(AuditLogRepository repository) {
        this.repository = repository;
    }

    /** Ghi trong transaction hiện tại để audit và nghiệp vụ cùng commit hoặc cùng rollback. */
    @Transactional
    public void log(UUID userId, String action, String entityType, UUID entityId, Map<String, Object> metadata) {
        AuditLog entry = new AuditLog();
        entry.setUserId(userId);
        entry.setAction(action);
        entry.setEntityType(entityType);
        entry.setEntityId(entityId);
        entry.setMetadata(metadata);
        repository.save(entry);
    }

    public void log(UUID userId, String action, String entityType, UUID entityId) {
        log(userId, action, entityType, entityId, null);
    }
}
