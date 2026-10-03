package com.lifely.donor;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "donation_history")
@Getter
@Setter
@NoArgsConstructor
public class DonationHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "donor_id")
    private UUID donorId;

    @Column(name = "donated_on")
    private LocalDate donatedOn;

    private String location;

    /** SELF_REPORTED hoặc LIFELY_MATCH */
    private String source;

    @Column(name = "match_id")
    private UUID matchId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
