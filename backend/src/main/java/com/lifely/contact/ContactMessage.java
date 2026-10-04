package com.lifely.contact;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "contact_messages")
@Getter
@Setter
@NoArgsConstructor
public class ContactMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    private String name;

    private String email;

    private String phone;

    private String message;

    @Enumerated(EnumType.STRING)
    private ContactStatus status = ContactStatus.NEW;

    @Column(name = "handled_by")
    private UUID handledBy;

    @Column(name = "handled_at")
    private Instant handledAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
