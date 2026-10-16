package com.lifely.request;

import com.lifely.donor.BloodType;
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
@Table(name = "blood_requests")
@Getter
@Setter
@NoArgsConstructor
public class BloodRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "requester_id")
    private UUID requesterId;

    @Column(name = "organization_id")
    private UUID organizationId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "blood_type_id")
    private BloodType bloodType;

    @Column(name = "units_required")
    private int unitsRequired;

    /** Số người hiến đã NHẬN LỜI (chưa phải lượng máu đã hiến). Dùng để dừng mời thêm khi đã đủ người. */
    @Column(name = "units_confirmed")
    private int unitsConfirmed;

    /** Số đơn vị đã được cơ sở y tế / bên điều phối XÁC NHẬN hiến thực tế. Chỉ tăng khi xác nhận lần hiến. */
    @Column(name = "units_received")
    private int unitsReceived;

    /** NONE | PENDING | CONFIRMED | DENIED: xác nhận của cơ sở đối với yêu cầu gắn với cơ sở đó. */
    @Column(name = "facility_review")
    private String facilityReview = "NONE";

    @Column(name = "idempotency_key")
    private String idempotencyKey;

    @Enumerated(EnumType.STRING)
    private Urgency urgency;

    @Enumerated(EnumType.STRING)
    private RequestStatus status = RequestStatus.CREATED;

    @Column(name = "hospital_name")
    private String hospitalName;

    private String city;

    private String district;

    @Column(precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(precision = 9, scale = 6)
    private BigDecimal longitude;

    private Instant deadline;

    @Column(name = "contact_phone")
    private String contactPhone;

    private String description;

    private boolean verified;

    @Column(name = "verified_by")
    private UUID verifiedBy;

    @Column(name = "escalation_level")
    private int escalationLevel = 1;

    @Column(name = "last_escalated_at")
    private Instant lastEscalatedAt;

    @Column(name = "cancel_reason")
    private String cancelReason;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    public int unitsStillNeeded() {
        return Math.max(0, unitsRequired - unitsConfirmed);
    }
}
