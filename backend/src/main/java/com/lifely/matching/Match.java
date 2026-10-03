package com.lifely.matching;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "matches")
@Getter
@Setter
@NoArgsConstructor
public class Match {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "request_id")
    private UUID requestId;

    @Column(name = "donor_id")
    private UUID donorId;

    @Column(name = "matching_score", precision = 5, scale = 2)
    private BigDecimal matchingScore;

    @Column(name = "distance_km", precision = 7, scale = 2)
    private BigDecimal distanceKm;

    @Column(name = "escalation_level")
    private int escalationLevel = 1;

    @Enumerated(EnumType.STRING)
    private MatchStatus status = MatchStatus.PENDING;

    @Column(name = "contacted_at")
    private Instant contactedAt;

    @Column(name = "responded_at")
    private Instant respondedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
