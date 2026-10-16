package com.lifely.notify;

import com.lifely.audit.AuditService;
import com.lifely.user.PrivacySettings;
import com.lifely.user.PrivacySettingsRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

/** Đồng ý nhận thông báo theo từng kênh. In-app luôn bật; email dùng cờ sẵn có; SMS/Voice mặc định CHƯA đồng ý. */
@Service
public class ConsentService {

    public record Consents(boolean inApp, boolean email, boolean sms, boolean voice,
                           boolean smsChannelEnabled, boolean voiceChannelEnabled, boolean mockMode,
                           boolean push, boolean pushChannelEnabled, boolean rejoinReminders) {
    }

    /** rejoinReminders: nhắc "đã có thể hiến lại", bật/tắt riêng với thông báo khẩn cấp. Push được bật bằng cách đăng ký thiết bị. */
    public record Update(Boolean email, Boolean sms, Boolean voice, Boolean rejoinReminders) {
        public Update(Boolean email, Boolean sms, Boolean voice) {
            this(email, sms, voice, null);
        }
    }

    private final JdbcTemplate jdbc;
    private final PrivacySettingsRepository privacy;
    private final OutboxService outbox;
    private final NotifyProperties props;
    private final AuditService audit;

    public ConsentService(JdbcTemplate jdbc, PrivacySettingsRepository privacy, OutboxService outbox,
                          NotifyProperties props, AuditService audit) {
        this.jdbc = jdbc;
        this.privacy = privacy;
        this.outbox = outbox;
        this.props = props;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public Consents get(UUID userId) {
        boolean email = privacy.findById(userId).map(PrivacySettings::isReceiveEmergencyNotifications).orElse(true);
        boolean rejoin = privacy.findById(userId).map(PrivacySettings::isReceiveRejoinReminders).orElse(true);
        return new Consents(true, email, outbox.hasConsent(userId, OutboxService.Channel.SMS),
                outbox.hasConsent(userId, OutboxService.Channel.VOICE), props.isSmsEnabled(), props.isVoiceEnabled(),
                "mock".equals(props.getProvider()), outbox.hasConsent(userId, OutboxService.Channel.PUSH),
                props.isPushEnabled(), rejoin);
    }

    @Transactional
    public Consents update(UUID userId, Update req) {
        if (req.email() != null) {
            privacy.findById(userId).ifPresent(p -> {
                p.setReceiveEmergencyNotifications(req.email());
                privacy.save(p);
            });
        }
        if (req.rejoinReminders() != null) {
            privacy.findById(userId).ifPresent(p -> {
                p.setReceiveRejoinReminders(req.rejoinReminders());
                privacy.save(p);
            });
        }
        apply(userId, OutboxService.Channel.SMS, req.sms());
        apply(userId, OutboxService.Channel.VOICE, req.voice());
        audit.log(userId, "CONSENT_UPDATED", "USER", userId, Map.of(
                "email", String.valueOf(req.email()), "sms", String.valueOf(req.sms()), "voice", String.valueOf(req.voice()),
                "rejoinReminders", String.valueOf(req.rejoinReminders())));
        return get(userId);
    }

    private void apply(UUID userId, OutboxService.Channel channel, Boolean granted) {
        if (granted == null) {
            return;
        }
        jdbc.update("""
                INSERT INTO notification_consents (user_id, channel, granted, source, updated_at)
                VALUES (?, ?, ?, 'USER_SETTINGS', now())
                ON CONFLICT (user_id, channel) DO UPDATE SET granted = EXCLUDED.granted, updated_at = now()
                """, userId, channel.name(), granted);
        if (!granted) {
            outbox.cancelPendingForUser(userId, channel);
        }
    }
}
