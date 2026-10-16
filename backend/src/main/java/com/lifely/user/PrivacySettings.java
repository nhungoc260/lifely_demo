package com.lifely.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "privacy_settings")
@Getter
@Setter
@NoArgsConstructor
public class PrivacySettings {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "show_approximate_location")
    private boolean showApproximateLocation = true;

    @Column(name = "allow_emergency_matching")
    private boolean allowEmergencyMatching = true;

    @Column(name = "receive_emergency_notifications")
    private boolean receiveEmergencyNotifications = true;

    /** Nhắc "đã có thể hiến máu lại": bật/tắt riêng với thông báo khẩn cấp. */
    @Column(name = "receive_rejoin_reminders")
    private boolean receiveRejoinReminders = true;

    @Column(name = "show_donation_count")
    private boolean showDonationCount = false;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    public PrivacySettings(UUID userId) {
        this.userId = userId;
    }
}
