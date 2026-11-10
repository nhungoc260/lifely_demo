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

    /** Mỗi người hiến chỉ được nhắc lại tối đa một lần trong khoảng này (tránh làm phiền). */
    public static final int REMIND_COOLDOWN_MINUTES = 30;

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

    /**
     * Nhắc lại người hiến đã được mời nhưng chưa phản hồi (matchId = null: tất cả; có matchId: đúng người đó).
     * Chỉ khi yêu cầu còn mở. Người vừa được nhắc trong 30 phút qua bị bỏ qua. Trả số người được nhắc.
     */
    @Transactional
    public int remindAwaiting(UUID userId, UUID requestId, UUID matchId) {
        BloodRequest r = access.requireViewable(userId, requestId);
        if (!REMINDABLE.contains(r.getStatus()) || !r.getDeadline().isAfter(Instant.now())) {
            throw AppException.badRequest("REQUEST_NOT_OPEN", "Yêu cầu không còn mở nên không thể nhắc lại");
        }
        int n = matchingService.remindAwaiting(r, matchId, java.time.Duration.ofMinutes(REMIND_COOLDOWN_MINUTES));
        if (n == 0) {
            throw new AppException(HttpStatus.TOO_MANY_REQUESTS, "REMIND_TOO_SOON", matchId != null
                    ? "Người này vừa được nhắc hoặc đã phản hồi. Vui lòng đợi " + REMIND_COOLDOWN_MINUTES + " phút rồi nhắc lại."
                    : "Những người chưa phản hồi đều vừa được nhắc. Vui lòng đợi " + REMIND_COOLDOWN_MINUTES + " phút rồi nhắc lại.");
        }
        return n;
    }
}
