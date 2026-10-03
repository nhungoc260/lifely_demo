package com.lifely.realtime;

import com.lifely.notification.NotificationDto;

import java.util.UUID;

public record NotificationCreatedEvent(UUID userId, NotificationDto notification, long unreadCount) {
}
