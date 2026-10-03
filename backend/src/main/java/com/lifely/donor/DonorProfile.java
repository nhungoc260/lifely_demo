package com.lifely.donor;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "donor_profiles")
@Getter
@Setter
@NoArgsConstructor
public class DonorProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id")
    private UUID userId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "blood_type_id")
    private BloodType bloodType;

    private String city;

    private String district;

    /** Vị trí chính xác: chỉ dùng cho matching, tuyệt đối không đưa ra API công khai. */
    @Column(precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(precision = 9, scale = 6)
    private BigDecimal longitude;

    @Column(name = "last_donation_date")
    private LocalDate lastDonationDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "availability_status")
    private AvailabilityStatus availabilityStatus = AvailabilityStatus.NOT_AVAILABLE;

    @Column(name = "total_donations")
    private int totalDonations;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    public DonorProfile(UUID userId) {
        this.userId = userId;
    }

    public boolean hasLocation() {
        return latitude != null && longitude != null;
    }
}
