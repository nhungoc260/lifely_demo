package com.lifely.organization;

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
@Table(name = "organizations")
@Getter
@Setter
@NoArgsConstructor
public class Organization {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "owner_user_id")
    private UUID ownerUserId;

    private String name;

    @Enumerated(EnumType.STRING)
    private OrgType type;

    private String address;

    private String city;

    private String district;

    @Column(precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(precision = 9, scale = 6)
    private BigDecimal longitude;

    private String phone;

    private String email;

    @Column(name = "contact_person")
    private String contactPerson;

    /** Mức hỗ trợ đi lại (đồng) cơ sở công bố cho người hiến máu tình nguyện mỗi lần hiến. */
    @Column(name = "travel_support_vnd")
    private int travelSupportVnd = 50_000;

    /** Phí gửi xe máy tại cơ sở (đồng); null = chưa cập nhật. */
    @Column(name = "parking_fee_vnd")
    private Integer parkingFeeVnd;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status")
    private OrgVerificationStatus verificationStatus = OrgVerificationStatus.PENDING;

    @Column(name = "verification_note")
    private String verificationNote;

    @Column(name = "verified_by")
    private UUID verifiedBy;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    public boolean isVerified() {
        return verificationStatus == OrgVerificationStatus.VERIFIED;
    }
}
