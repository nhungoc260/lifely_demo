package com.lifely.notify;

import com.lifely.push.PushService;
import com.lifely.push.WebPushSender;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.UUID;

/**
 * Gửi SMS (mock) / Web Push từ bảng notification_outbox SAU KHI nghiệp vụ đã commit.
 * - Nhận việc bằng UPDATE ... FOR UPDATE SKIP LOCKED trong transaction ngắn; GỌI NHÀ CUNG CẤP NGOÀI transaction.
 * - Kiểm tra lại ngay trước khi gửi: kênh còn bật, người dùng còn hoạt động và còn đồng ý, yêu cầu còn mở, chưa vượt giới hạn tần suất.
 * - Retry có giới hạn với độ trễ tăng dần. Đây là at-least-once: không bảo đảm exactly-once với nhà cung cấp.
 */
@Component
public class OutboxWorker {

    private static final Logger log = LoggerFactory.getLogger(OutboxWorker.class);

    record Claimed(UUID id, String channel, UUID userId, String purpose, String referenceType, UUID referenceId,
                   String body, int attempts, int maxAttempts, String dedupeKey) {
    }

    private final JdbcTemplate jdbc;
    private final TransactionTemplate tx;
    private final NotifyProperties props;
    private final ObjectProvider<SmsProvider> sms;
    private final PushService push;
    private final WebPushSender pushSender;

    public OutboxWorker(JdbcTemplate jdbc, PlatformTransactionManager txManager, NotifyProperties props,
                        ObjectProvider<SmsProvider> sms,
                        PushService push, WebPushSender pushSender) {
        this.jdbc = jdbc;
        this.tx = new TransactionTemplate(txManager);
        this.props = props;
        this.sms = sms;
        this.push = push;
        this.pushSender = pushSender;
    }

    @Scheduled(fixedDelayString = "${lifely.notify.worker-interval-ms:10000}",
               initialDelayString = "${lifely.notify.worker-initial-delay-ms:20000}")
    public void run() {
        try {
            runOnce();
        } catch (Exception e) {
            log.error("Outbox worker lỗi", e);
        }
    }

    /** Một vòng xử lý; trả số bản ghi đã nhận xử lý. Public để test gọi trực tiếp. */
    public int runOnce() {
        tx.executeWithoutResult(s -> recoverStuck());
        List<Claimed> batch = tx.execute(s -> claim());
        if (batch == null) {
            return 0;
        }
        for (Claimed c : batch) {
            try {
                process(c);
            } catch (Exception e) {
                log.error("Xử lý outbox {} lỗi", c.id(), e);
                finish(c, SendResult.retry("WORKER_ERROR"));
            }
        }
        return batch.size();
    }

    private void recoverStuck() {
        int minutes = props.getStuckAfterMinutes();
        jdbc.update("""
                UPDATE notification_outbox SET status = 'FAILED', last_error_code = 'STUCK_MAX_ATTEMPTS'
                 WHERE status = 'SENDING' AND attempts >= max_attempts
                   AND updated_at < now() - (? * interval '1 minute')
                """, minutes);
        jdbc.update("""
                UPDATE notification_outbox SET status = 'PENDING', last_error_code = 'RECOVERED_STUCK'
                 WHERE status = 'SENDING' AND attempts < max_attempts
                   AND updated_at < now() - (? * interval '1 minute')
                """, minutes);
    }

    private List<Claimed> claim() {
        return jdbc.query("""
                UPDATE notification_outbox SET status = 'SENDING', attempts = attempts + 1
                 WHERE id IN (SELECT id FROM notification_outbox
                               WHERE status = 'PENDING' AND next_attempt_at <= now()
                               ORDER BY next_attempt_at
                               LIMIT ? FOR UPDATE SKIP LOCKED)
                RETURNING id, channel, recipient_user_id, purpose, reference_type, reference_id, body,
                          attempts, max_attempts, dedupe_key
                """, (rs, i) -> new Claimed(rs.getObject("id", UUID.class), rs.getString("channel"),
                rs.getObject("recipient_user_id", UUID.class), rs.getString("purpose"),
                rs.getString("reference_type"), rs.getObject("reference_id", UUID.class), rs.getString("body"),
                rs.getInt("attempts"), rs.getInt("max_attempts"), rs.getString("dedupe_key")), props.getBatchSize());
    }

    private void process(Claimed c) {
        String ch = c.channel();
        boolean isPush = "PUSH".equals(ch);
        boolean enabled = switch (ch) {
            case "SMS" -> props.isSmsEnabled();
            default -> props.isPushEnabled() && pushSender.isConfigured();
        };
        if (!enabled) {
            cancel(c, "CHANNEL_DISABLED");
            return;
        }
        List<String[]> user = jdbc.query("SELECT phone, status FROM users WHERE id = ?",
                (rs, i) -> new String[]{rs.getString("phone"), rs.getString("status")}, c.userId());
        if (user.isEmpty() || !"ACTIVE".equals(user.get(0)[1])) {
            cancel(c, "USER_INACTIVE");
            return;
        }
        String phone = user.get(0)[0];
        if (!isPush && (phone == null || phone.isBlank())) {
            cancel(c, "NO_PHONE");
            return;
        }
        Integer consent = jdbc.queryForObject(
                "SELECT count(*) FROM notification_consents WHERE user_id = ? AND channel = ? AND granted = TRUE",
                Integer.class, c.userId(), ch);
        if (consent == null || consent == 0) {
            cancel(c, "CONSENT_REVOKED");
            return;
        }
        if ("REQUEST".equals(c.referenceType()) && (OutboxService.PURPOSE_INVITE.equals(c.purpose())
                || OutboxService.PURPOSE_STAFF_ALERT.equals(c.purpose()))) {
            Integer open = jdbc.queryForObject("""
                    SELECT count(*) FROM blood_requests
                     WHERE id = ? AND deadline > now()
                       AND status IN ('VERIFIED', 'MATCHING', 'DONORS_CONTACTED', 'PARTIALLY_FULFILLED')
                    """, Integer.class, c.referenceId());
            if (open == null || open == 0) {
                cancel(c, "REQUEST_CLOSED");
                return;
            }
        }
        int limit = switch (ch) {
            case "SMS" -> props.getSmsPerUserPerDay();
            default -> props.getPushPerUserPerDay();
        };
        Integer recent = jdbc.queryForObject("""
                SELECT count(*) FROM notification_outbox
                 WHERE recipient_user_id = ? AND channel = ? AND status = 'SENT' AND sent_at > now() - interval '24 hours'
                """, Integer.class, c.userId(), ch);
        if (recent != null && recent >= limit) {
            cancel(c, "RATE_LIMITED");
            return;
        }
        SendResult result;
        try {
            if (isPush) {
                result = sendPush(c);
                if (result == null) {
                    return;   // đã tự hủy (không còn thiết bị)
                }
            } else if ("SMS".equals(ch)) {
                SmsProvider p = sms.getIfAvailable();
                result = p == null ? SendResult.fail("NO_PROVIDER") : p.send(phone, c.body(), c.dedupeKey());
            } else {
                // Kênh không còn được hỗ trợ (ví dụ VOICE cũ): hủy, không bao giờ gọi điện tự động.
                cancel(c, "CHANNEL_UNSUPPORTED");
                return;
            }
        } catch (Exception e) {
            // Timeout / lỗi mạng: coi là tạm thời.
            result = SendResult.retry("PROVIDER_EXCEPTION");
        }
        finish(c, result);
    }

    /** Gửi tới mọi thiết bị đã đăng ký của người nhận. Thành công nếu có ít nhất một thiết bị nhận được. */
    private SendResult sendPush(Claimed c) {
        List<PushService.Sub> subs = push.subscriptionsOf(c.userId());
        if (subs.isEmpty()) {
            cancel(c, "NO_SUBSCRIPTION");
            return null;
        }
        String urgency = OutboxService.PURPOSE_INVITE.equals(c.purpose()) || OutboxService.PURPOSE_STAFF_ALERT.equals(c.purpose())
                ? "high" : "normal";
        int ok = 0;
        int retry = 0;
        int gone = 0;
        for (PushService.Sub s : subs) {
            WebPushSender.Result r = pushSender.send(s.endpoint(), s.p256dh(), s.auth(), c.body(), urgency);
            switch (r.outcome()) {
                case OK -> {
                    ok++;
                    push.markSuccess(s.id());
                }
                case GONE -> {
                    gone++;
                    push.remove(s.id());   // thiết bị đã gỡ đăng ký: dọn khỏi DB
                }
                case RETRY -> retry++;
                default -> {
                }
            }
        }
        if (ok > 0) {
            return SendResult.ok("push:" + ok);
        }
        if (retry > 0) {
            return SendResult.retry("PUSH_TRANSIENT");
        }
        if (gone == subs.size()) {
            cancel(c, "SUBSCRIPTION_GONE");
            return null;
        }
        return SendResult.fail("PUSH_FAILED");
    }

    void finish(Claimed c, SendResult r) {
        if (r.ok()) {
            jdbc.update("""
                    UPDATE notification_outbox SET status = 'SENT', sent_at = now(), provider_message_id = ?, last_error_code = NULL
                     WHERE id = ?
                    """, r.providerMessageId(), c.id());
        } else if (r.retryable() && c.attempts() < c.maxAttempts()) {
            long delay = (long) props.getRetryBaseSeconds() * (1L << Math.min(c.attempts() - 1, 10));
            jdbc.update("""
                    UPDATE notification_outbox SET status = 'PENDING', last_error_code = ?,
                           next_attempt_at = now() + (? * interval '1 second')
                     WHERE id = ?
                    """, r.errorCode(), delay, c.id());
        } else {
            jdbc.update("UPDATE notification_outbox SET status = 'FAILED', last_error_code = ? WHERE id = ?",
                    r.errorCode(), c.id());
        }
    }

    private void cancel(Claimed c, String reason) {
        jdbc.update("UPDATE notification_outbox SET status = 'CANCELLED', last_error_code = ? WHERE id = ?",
                reason, c.id());
    }
}
