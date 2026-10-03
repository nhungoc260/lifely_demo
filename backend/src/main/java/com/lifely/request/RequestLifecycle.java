package com.lifely.request;

import com.lifely.realtime.RequestChangedEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/** Điểm duy nhất thay đổi trạng thái request: luôn ghi lịch sử và phát sự kiện realtime. */
@Component
public class RequestLifecycle {

    private final BloodRequestRepository requestRepository;
    private final RequestStatusHistoryRepository historyRepository;
    private final ApplicationEventPublisher events;

    public RequestLifecycle(BloodRequestRepository requestRepository,
                            RequestStatusHistoryRepository historyRepository,
                            ApplicationEventPublisher events) {
        this.requestRepository = requestRepository;
        this.historyRepository = historyRepository;
        this.events = events;
    }

    @Transactional
    public void transition(BloodRequest request, RequestStatus to, String note, UUID actorId) {
        RequestStatus from = request.getStatus();
        request.setStatus(to);
        requestRepository.save(request);
        recordHistory(request.getId(), from, to, note, actorId);
        publish(request);
    }

    /** Ghi một dòng lịch sử mà không đổi trạng thái (ví dụ "3 donors contacted"). */
    @Transactional
    public void note(BloodRequest request, String note, UUID actorId) {
        recordHistory(request.getId(), request.getStatus(), request.getStatus(), note, actorId);
    }

    public void publish(BloodRequest r) {
        events.publishEvent(new RequestChangedEvent(r.getId(), r.getUnitsConfirmed(), r.getUnitsRequired(),
                r.getStatus().name(), Instant.now()));
    }

    private void recordHistory(UUID requestId, RequestStatus from, RequestStatus to, String note, UUID actorId) {
        RequestStatusHistory h = new RequestStatusHistory();
        h.setRequestId(requestId);
        h.setFromStatus(from);
        h.setToStatus(to);
        h.setNote(note);
        h.setActorId(actorId);
        historyRepository.save(h);
    }
}
