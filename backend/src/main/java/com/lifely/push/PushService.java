package com.lifely.push;

import com.lifely.common.AppException;
import com.lifely.notify.OutboxService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/** Quản lý đăng ký Web Push của người dùng. Đăng ký = đồng ý kênh PUSH; hủy hết thiết bị = rút đồng ý. */
@Service
public class PushService {

    public record Sub(UUID id, String endpoint, String p256dh, String auth) {
    }

    private static final int MAX_SUBSCRIPTIONS_PER_USER = 10;

    private final JdbcTemplate jdbc;
    private final PushProperties props;
    private final OutboxService outbox;

    public PushService(JdbcTemplate jdbc, PushProperties props, OutboxService outbox) {
        this.jdbc = jdbc;
        this.props = props;
        this.outbox = outbox;
    }

    public String publicKey() {
        return props.getPublicKey();
    }

    /** Endpoint phải là https tới dịch vụ push đã biết (chống SSRF); ngoại lệ http://localhost chỉ khi bật cờ kiểm thử. */
    boolean endpointAllowed(String endpoint) {
        try {
            URI u = URI.create(endpoint);
            String host = u.getHost() == null ? "" : u.getHost().toLowerCase(Locale.ROOT);
            if (u.getUserInfo() != null || host.isEmpty()) {
                return false;
            }
            if (props.isAllowInsecureLocalhost() && "http".equals(u.getScheme())
                    && (host.equals("localhost") || host.equals("127.0.0.1"))) {
                return true;
            }
            if (!"https".equals(u.getScheme())) {
                return false;
            }
            for (String s : props.getAllowedHostSuffixes()) {
                String suffix = s.toLowerCase(Locale.ROOT);
                if (host.equals(suffix) || host.endsWith("." + suffix)) {
                    return true;
                }
            }
            return false;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    @Transactional
    public void subscribe(UUID userId, String endpoint, String p256dh, String auth, String userAgent) {
        if (endpoint == null || endpoint.length() > 2000 || !endpointAllowed(endpoint)) {
            throw AppException.badRequest("INVALID_PUSH_ENDPOINT", "Địa chỉ nhận thông báo không hợp lệ");
        }
        if (p256dh == null || auth == null || p256dh.length() > 200 || auth.length() > 100) {
            throw AppException.badRequest("INVALID_PUSH_KEYS", "Khóa đăng ký không hợp lệ");
        }
        Integer n = jdbc.queryForObject("SELECT count(*) FROM push_subscriptions WHERE user_id = ? AND endpoint <> ?",
                Integer.class, userId, endpoint);
        if (n != null && n >= MAX_SUBSCRIPTIONS_PER_USER) {
            throw AppException.conflict("TOO_MANY_DEVICES", "Đã đạt số thiết bị tối đa nhận thông báo đẩy");
        }
        String ua = userAgent == null ? null : (userAgent.length() > 200 ? userAgent.substring(0, 200) : userAgent);
        jdbc.update("""
                INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh,
                       auth = EXCLUDED.auth, user_agent = EXCLUDED.user_agent
                """, userId, endpoint, p256dh, auth, ua);
        setConsent(userId, true);
    }

    @Transactional
    public void unsubscribe(UUID userId, String endpoint) {
        jdbc.update("DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?", userId, endpoint);
        if (count(userId) == 0) {
            setConsent(userId, false);
            outbox.cancelPendingForUser(userId, OutboxService.Channel.PUSH);
        }
    }

    @Transactional
    public void unsubscribeAll(UUID userId) {
        jdbc.update("DELETE FROM push_subscriptions WHERE user_id = ?", userId);
        setConsent(userId, false);
        outbox.cancelPendingForUser(userId, OutboxService.Channel.PUSH);
    }

    public int count(UUID userId) {
        Integer n = jdbc.queryForObject("SELECT count(*) FROM push_subscriptions WHERE user_id = ?", Integer.class, userId);
        return n == null ? 0 : n;
    }

    public List<Sub> subscriptionsOf(UUID userId) {
        return jdbc.query("SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ? ORDER BY created_at",
                (rs, i) -> new Sub(rs.getObject("id", UUID.class), rs.getString("endpoint"), rs.getString("p256dh"),
                        rs.getString("auth")), userId);
    }

    public void markSuccess(UUID id) {
        jdbc.update("UPDATE push_subscriptions SET last_success_at = now() WHERE id = ?", id);
    }

    public void remove(UUID id) {
        jdbc.update("DELETE FROM push_subscriptions WHERE id = ?", id);
    }

    private void setConsent(UUID userId, boolean granted) {
        jdbc.update("""
                INSERT INTO notification_consents (user_id, channel, granted, source, updated_at)
                VALUES (?, 'PUSH', ?, 'PUSH_SUBSCRIBE', now())
                ON CONFLICT (user_id, channel) DO UPDATE SET granted = EXCLUDED.granted, updated_at = now()
                """, userId, granted);
    }
}
