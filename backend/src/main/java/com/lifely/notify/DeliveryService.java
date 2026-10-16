package com.lifely.notify;

import com.lifely.request.RequestAccess;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Theo dõi phát thông báo của một yêu cầu cho nhân viên/chủ yêu cầu: không trả số điện thoại hay danh tính người nhận. */
@Service
public class DeliveryService {

    public record Count(String channel, String status, long total) {
    }

    public record Delivery(List<Count> outbox, Map<String, Long> responses, long failed) {
    }

    private final JdbcTemplate jdbc;
    private final RequestAccess access;

    public DeliveryService(JdbcTemplate jdbc, RequestAccess access) {
        this.jdbc = jdbc;
        this.access = access;
    }

    @Transactional(readOnly = true)
    public Delivery summary(UUID userId, UUID requestId) {
        access.requireViewable(userId, requestId);
        List<Count> counts = jdbc.query("""
                SELECT channel, status, count(*) AS n FROM notification_outbox
                 WHERE reference_type = 'REQUEST' AND reference_id = ? GROUP BY channel, status ORDER BY channel, status
                """, (rs, i) -> new Count(rs.getString("channel"), rs.getString("status"), rs.getLong("n")), requestId);
        Map<String, Long> responses = new LinkedHashMap<>();
        jdbc.query("SELECT status, count(*) AS n FROM matches WHERE request_id = ? GROUP BY status ORDER BY status",
                rs -> {
                    responses.put(rs.getString("status"), rs.getLong("n"));
                }, requestId);
        long failed = counts.stream().filter(c -> "FAILED".equals(c.status())).mapToLong(Count::total).sum();
        return new Delivery(counts, responses, failed);
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
}
