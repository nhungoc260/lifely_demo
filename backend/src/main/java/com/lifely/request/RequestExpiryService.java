package com.lifely.request;

import com.lifely.matching.MatchingService;
import com.lifely.notification.NotificationService;
import com.lifely.notification.NotificationType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class RequestExpiryService {

    private final BloodRequestRepository requestRepository;
    private final RequestLifecycle lifecycle;
    private final MatchingService matchingService;
    private final NotificationService notifications;

    public RequestExpiryService(BloodRequestRepository requestRepository, RequestLifecycle lifecycle,
                                MatchingService matchingService, NotificationService notifications) {
        this.requestRepository = requestRepository;
        this.lifecycle = lifecycle;
        this.matchingService = matchingService;
        this.notifications = notifications;
    }

    /** Mỗi request hết hạn được xử lý trong transaction riêng để một lỗi không chặn các request khác. */
    @Transactional
    public boolean expire(UUID requestId) {
        BloodRequest r = requestRepository.findByIdForUpdate(requestId).orElse(null);
        if (r == null || !RequestStatus.AWAITING_OR_ACTIVE.contains(r.getStatus())
                || r.getDeadline().isAfter(Instant.now())) {
            return false;
        }
        lifecycle.transition(r, RequestStatus.EXPIRED, "Đã quá hạn", null);
        matchingService.expireOpenMatches(r);
        notifications.notify(r.getRequesterId(), NotificationType.REQUEST_EXPIRED, "Yêu cầu đã hết hạn",
                "Yêu cầu " + r.getBloodType().getCode() + " của bạn đã quá hạn với "
                        + r.getUnitsConfirmed() + " / " + r.getUnitsRequired() + " đơn vị đã xác nhận.",
                "REQUEST", r.getId());
        return true;
    }
}
