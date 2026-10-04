package com.lifely.contact;

import java.time.Instant;
import java.util.UUID;

public record ContactMessageDto(UUID id, String name, String email, String phone, String message,
                                ContactStatus status, boolean fromRegisteredUser, Instant createdAt, Instant handledAt) {

    public static ContactMessageDto from(ContactMessage m) {
        return new ContactMessageDto(m.getId(), m.getName(), m.getEmail(), m.getPhone(), m.getMessage(), m.getStatus(),
                m.getUserId() != null, m.getCreatedAt(), m.getHandledAt());
    }
}
