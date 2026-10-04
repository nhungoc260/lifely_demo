package com.lifely.notification;

import java.time.Instant;
import java.util.UUID;

public record NotificationDto(UUID id, NotificationType type, String title, String message, boolean read,
                              String referenceType, UUID referenceId, Instant createdAt) {

    public static NotificationDto from(Notification n) {
        return new NotificationDto(n.getId(), n.getType(), n.getTitle(), n.getMessage(), n.isReadFlag(),
                n.getReferenceType(), n.getReferenceId(), n.getCreatedAt());
    }
}
