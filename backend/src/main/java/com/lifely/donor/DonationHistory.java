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

    /** SELF_REPORTED, REQUESTER_CONFIRMED hoặc ORG_VERIFIED (xem {@link VerificationLevel}). */
    @Column(name = "verification_level")
    private String verificationLevel = VerificationLevel.SELF_REPORTED.name();

    @Column(name = "confirmed_by_user_id")
    private UUID confirmedByUserId;

    @Column(name = "confirmed_by_org_id")
    private UUID confirmedByOrgId;

    /** Tên tổ chức tại thời điểm xác nhận (lưu lại để lịch sử không đổi khi tổ chức đổi tên). */
    @Column(name = "confirmed_by_org_name")
    private String confirmedByOrgName;

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
