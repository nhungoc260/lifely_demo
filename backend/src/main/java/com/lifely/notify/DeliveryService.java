package com.lifely.notify;

import com.lifely.common.AppException;
import com.lifely.matching.MatchingService;
import com.lifely.request.BloodRequest;
import com.lifely.request.RequestAccess;
import com.lifely.request.RequestStatus;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Theo dõi phát thông báo của một yêu cầu cho nhân viên/chủ yêu cầu: không trả số điện thoại hay danh tính người nhận. */
@Service
public class DeliveryService {

    /** reason: mã lý do khi tin bị hủy/lỗi (ví dụ NO_SUBSCRIPTION), null nếu không có. */
    public record Count(String channel, String status, String reason, long total) {
    }

    /**
     * inApp: số người đã nhận thông báo trong ứng dụng (kênh luôn hoạt động).
     * smsEnabled/pushEnabled/smsMock: trạng thái cấu hình để giao diện nói đúng sự thật về SMS/push.
     */
    public record Delivery(List<Count> outbox, Map<String, Long> responses, long failed,
                           long inApp, boolean smsEnabled, boolean pushEnabled, boolean smsMock) {
    }

    private final JdbcTemplate jdbc;
    private final RequestAccess access;
    private final MatchingService matchingService;
    private final NotifyProperties props;

    /** Khoảng cách tối thiểu giữa hai lần nhắc của cùng một yêu cầu (tránh làm phiền người hiến). */
    static final int REMIND_COOLDOWN_MINUTES = 10;

    public DeliveryService(JdbcTemplate jdbc, RequestAccess access, MatchingService matchingService,
                           NotifyProperties props) {
        this.jdbc = jdbc;
        this.access = access;
        this.matchingService = matchingService;
        this.props = props;
    }

    @Transactional(readOnly = true)
    public Delivery summary(UUID userId, UUID requestId) {
        access.requireViewable(userId, requestId);
        List<Count> counts = jdbc.query("""
                SELECT channel, status, last_error_code, count(*) AS n FROM notification_outbox
                 WHERE reference_type = 'REQUEST' AND reference_id = ? GROUP BY channel, status, last_error_code
                 ORDER BY channel, status
                """, (rs, i) -> new Count(rs.getString("channel"), rs.getString("status"),
                rs.getString("last_error_code"), rs.getLong("n")), requestId);
        Map<String, Long> responses = new LinkedHashMap<>();
        jdbc.query("SELECT status, count(*) AS n FROM matches WHERE request_id = ? GROUP BY status ORDER BY status",
                rs -> {
                    responses.put(rs.getString("status"), rs.getLong("n"));
                }, requestId);
        long failed = counts.stream().filter(c -> "FAILED".equals(c.status())).mapToLong(Count::total).sum();
        Long inApp = jdbc.queryForObject("""
                SELECT count(DISTINCT n.user_id) FROM notifications n
                  JOIN matches m ON n.reference_type = 'MATCH' AND n.reference_id = m.id
                 WHERE m.request_id = ? AND n.type = 'NEW_MATCH'
                """, Long.class, requestId);
        return new Delivery(counts, responses, failed, inApp == null ? 0 : inApp,
                props.isSmsEnabled(), props.isPushEnabled(), "mock".equalsIgnoreCase(props.getProvider()));
    }

    /** Đưa các tin FAILED về PENDING để thử lại (chỉ khi yêu cầu còn mở). Trả số tin được xếp lại. */
    @Transactional
    public int retryFailed(UUID userId, UUID requestId) {
        access.requireViewable(userId, requestId);
        return jdbc.update("""
                UPDATE notification_outbox o SET status = 'PENDING', attempts = 0, next_attempt_at = now(), last_error_code = NULL
                 WHERE o.reference_type = 'REQUEST' AND o.reference_id = ? AND o.status = 'FAILED'
                   AND EXISTS (SELECT 1 FROM blood_requests r WHERE r.id = o.reference_id AND r.deadline > now()
                               AND r.status IN ('VERIFIED', 'MATCHING', 'DONORS_CONTACTED', 'PARTIALLY_FULFILLED'))
                """, requestId);
    }

    private static final java.util.Set<RequestStatus> REMINDABLE = java.util.EnumSet.of(
            RequestStatus.VERIFIED, RequestStatus.MATCHING, RequestStatus.DONORS_CONTACTED, RequestStatus.PARTIALLY_FULFILLED);

    /** Nhắc lại người hiến đã được mời nhưng chưa phản hồi. Chỉ khi yêu cầu còn mở; tối đa 1 lần / 10 phút. Trả số người được nhắc. */
    @Transactional
    public int remindAwaiting(UUID userId, UUID requestId) {
        BloodRequest r = access.requireViewable(userId, requestId);
        if (!REMINDABLE.contains(r.getStatus()) || !r.getDeadline().isAfter(Instant.now())) {
            throw AppException.badRequest("REQUEST_NOT_OPEN", "Yêu cầu không còn mở nên không thể nhắc lại");
        }
        Integer recent = jdbc.queryForObject("""
                SELECT count(*) FROM notification_outbox
                 WHERE reference_type = 'REQUEST' AND reference_id = ? AND purpose = ?
                   AND created_at > now() - make_interval(mins => ?)
                """, Integer.class, requestId, OutboxService.PURPOSE_REMIND, REMIND_COOLDOWN_MINUTES);
        Integer recentInApp = jdbc.queryForObject("""
                SELECT count(*) FROM match_events e JOIN matches m ON m.id = e.match_id
                 WHERE m.request_id = ? AND e.event_type = 'REMINDED' AND e.created_at > now() - make_interval(mins => ?)
                """, Integer.class, requestId, REMIND_COOLDOWN_MINUTES);
        if ((recent != null && recent > 0) || (recentInApp != null && recentInApp > 0)) {
            throw new AppException(HttpStatus.TOO_MANY_REQUESTS, "REMIND_TOO_SOON",
                    "Bạn vừa nhắc xong. Vui lòng đợi " + REMIND_COOLDOWN_MINUTES + " phút rồi nhắc lại.");
        }
        return matchingService.remindAwaiting(r);
    }
}
