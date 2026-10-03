package com.lifely.request;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "request_status_history")
@Getter
@Setter
@NoArgsConstructor
public class RequestStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "request_id")
    private UUID requestId;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status")
    private RequestStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status")
    private RequestStatus toStatus;

    private String note;

    @Column(name = "actor_id")
    private UUID actorId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
