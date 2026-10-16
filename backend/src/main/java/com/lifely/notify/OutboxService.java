package com.lifely.notify;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Transactional outbox cho SMS (mock) / Web Push: bản ghi được ghi CÙNG transaction với nghiệp vụ gọi nó
 * (rollback thì không có gì được gửi); {@link OutboxWorker} gửi sau khi đã commit.
 * Chỉ xếp hàng khi kênh được bật VÀ người nhận đã đồng ý kênh đó. Khóa dedupe chống xếp trùng.
 */
@Service
public class OutboxService {

    public enum Channel { SMS, PUSH }

    public static final String PURPOSE_INVITE = "REQUEST_INVITE";
    public static final String PURPOSE_STAFF_ALERT = "STAFF_ALERT";
    public static final String PURPOSE_APPT_CONFIRM = "APPT_CONFIRM";
    public static final String PURPOSE_APPT_REMINDER = "APPT_REMINDER";
    public static final String PURPOSE_REJOIN = "REJOIN_REMINDER";

    private static final String DISCLAIMER = " LIFELY chỉ hỗ trợ điều phối; việc đủ điều kiện hiến máu do cơ sở y tế quyết định.";

    private final JdbcTemplate jdbc;
    private final NotifyProperties props;
    private final String frontendUrl;

    public OutboxService(JdbcTemplate jdbc, NotifyProperties props,
                         @Value("${lifely.frontend-url:http://localhost:3000}") String frontendUrl) {
        this.jdbc = jdbc;
        this.props = props;
        this.frontendUrl = frontendUrl;
    }

    public boolean channelEnabled(Channel channel) {
        return switch (channel) {
            case SMS -> props.isSmsEnabled();
            case PUSH -> props.isPushEnabled();
        };
    }

    /** Mặc định chưa đồng ý: chỉ có dòng granted=true mới cho phép gửi. */
    public boolean hasConsent(UUID userId, Channel channel) {
        Integer n = jdbc.queryForObject(
                "SELECT count(*) FROM notification_consents WHERE user_id = ? AND channel = ? AND granted = TRUE",
                Integer.class, userId, channel.name());
        return n != null && n > 0;
    }

    /**
     * Xếp hàng một tin. Trả true nếu đã thêm mới; false nếu kênh tắt, chưa đồng ý hoặc đã có tin cùng dedupeKey.
     * Phải được gọi trong transaction nghiệp vụ (propagation mặc định).
     */
    @Transactional
    public boolean enqueue(UUID userId, Channel channel, String purpose, String referenceType, UUID referenceId,
                           String body, String dedupeKey) {
        if (!channelEnabled(channel) || !hasConsent(userId, channel)) {
            return false;
        }
        String text = body.length() > 880 ? body.substring(0, 880) : body;
        int n = jdbc.update("""
                INSERT INTO notification_outbox
                    (dedupe_key, channel, recipient_user_id, purpose, reference_type, reference_id, body, max_attempts)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (dedupe_key) DO NOTHING
                """, dedupeKey, channel.name(), userId, purpose, referenceType, referenceId, text, props.getMaxAttempts());
        return n > 0;
    }

    /**
     * Hủy các tin CHƯA gửi của một đối tượng (ví dụ yêu cầu đã đủ / hủy / hết hạn). purpose=null: hủy mọi mục đích.
     * Tin đã chuyển SENDING thì không rút lại được (worker còn kiểm tra lại trạng thái ngay trước khi gửi).
     */
    @Transactional
    public int cancelPending(String referenceType, UUID referenceId, String purpose) {
        if (purpose == null) {
            return jdbc.update("""
                    UPDATE notification_outbox SET status = 'CANCELLED', last_error_code = 'REFERENCE_CLOSED'
                     WHERE reference_type = ? AND reference_id = ? AND status = 'PENDING'
                    """, referenceType, referenceId);
        }
        return jdbc.update("""
                UPDATE notification_outbox SET status = 'CANCELLED', last_error_code = 'REFERENCE_CLOSED'
                 WHERE reference_type = ? AND reference_id = ? AND purpose = ? AND status = 'PENDING'
                """, referenceType, referenceId, purpose);
    }

    /** Người dùng rút đồng ý: các tin chưa gửi của kênh đó bị hủy ngay. */
    @Transactional
    public int cancelPendingForUser(UUID userId, Channel channel) {
        return jdbc.update("""
                UPDATE notification_outbox SET status = 'CANCELLED', last_error_code = 'CONSENT_REVOKED'
                 WHERE recipient_user_id = ? AND channel = ? AND status = 'PENDING'
                """, userId, channel.name());
    }

    /**
     * Xếp một Web Push (nội dung JSON {title, body, url}). Chỉ ghi khi kênh PUSH bật và người nhận đã đăng ký thiết bị.
     * Nội dung không chứa dữ liệu bệnh nhân hay dữ liệu sức khỏe.
     */
    @Transactional
    public boolean enqueuePush(UUID userId, String purpose, String referenceType, UUID referenceId,
                               String title, String body, String url, String dedupeKey) {
        return enqueue(userId, Channel.PUSH, purpose, referenceType, referenceId, pushPayload(title, body, url), dedupeKey);
    }

    static String pushPayload(String title, String body, String url) {
        return "{\"title\":\"" + json(title) + "\",\"body\":\"" + json(body) + "\",\"url\":\"" + json(url) + "\"}";
    }

    private static String json(String s) {
        StringBuilder b = new StringBuilder(s.length() + 8);
        for (char c : s.toCharArray()) {
            switch (c) {
                case '"' -> b.append("\\\"");
                case '\\' -> b.append("\\\\");
                case '\n' -> b.append("\\n");
                case '\r' -> b.append("\\r");
                case '\t' -> b.append("\\t");
                default -> {
                    if (c < 0x20) {
                        b.append(String.format("\\u%04x", (int) c));
                    } else {
                        b.append(c);
                    }
                }
            }
        }
        return b.toString();
    }

    // ------------------------------------------------------------------ nội dung (không chứa dữ liệu bệnh nhân)

    public String inviteSms(String bloodCode, String hospital) {
        return "LIFELY: Cần máu " + bloodCode + " tại " + hospital + ". Mở ứng dụng để phản hồi: "
                + frontendUrl + "/donor/requests." + DISCLAIMER;
    }

    public String staffAlertSms(String bloodCode, int units) {
        return "LIFELY: Yêu cầu máu mới tại cơ sở của bạn (nhóm " + bloodCode + ", " + units
                + " đơn vị). Vui lòng xác nhận hoặc từ chối: " + frontendUrl + "/organization/requests";
    }

    public String appointmentSms(String when, String orgName, boolean reminder) {
        return "LIFELY: " + (reminder ? "Nhắc lịch hiến máu" : "Đã ghi nhận lịch hiến máu") + " lúc " + when + " tại "
                + orgName + ". Xem hoặc hủy lịch: " + frontendUrl + "/donor/appointments. Lịch hẹn chưa phải xác nhận đủ điều kiện hiến máu.";
    }
}
