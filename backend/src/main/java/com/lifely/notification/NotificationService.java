package com.lifely.notification;

import com.lifely.common.AppException;
import com.lifely.common.PageResponse;
import com.lifely.realtime.NotificationCreatedEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class NotificationService {

    private final NotificationRepository repository;
    private final ApplicationEventPublisher events;

    public NotificationService(NotificationRepository repository, ApplicationEventPublisher events) {
        this.repository = repository;
        this.events = events;
    }

    /** Lưu thông báo và phát sự kiện realtime (chỉ gửi sau khi commit). */
    @Transactional
    public void notify(UUID userId, NotificationType type, String title, String message,
                       String referenceType, UUID referenceId) {
        Notification n = new Notification();
        n.setUserId(userId);
        n.setType(type);
        n.setTitle(title);
        n.setMessage(message);
        n.setReferenceType(referenceType);
        n.setReferenceId(referenceId);
        n = repository.save(n);
        events.publishEvent(new NotificationCreatedEvent(userId, NotificationDto.from(n),
                repository.countByUserIdAndReadFalse(userId)));
    }

    @Transactional(readOnly = true)
    public PageResponse<NotificationDto> list(UUID userId, boolean unreadOnly, int page, int size) {
        PageRequest pr = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50));
        Page<Notification> result = unreadOnly
                ? repository.findByUserIdAndReadFalseOrderByCreatedAtDesc(userId, pr)
                : repository.findByUserIdOrderByCreatedAtDesc(userId, pr);
        return PageResponse.of(result, NotificationDto::from);
    }

    @Transactional(readOnly = true)
    public long unreadCount(UUID userId) {
        return repository.countByUserIdAndReadFalse(userId);
    }

    /** Chỉ chủ sở hữu mới đánh dấu đã đọc được thông báo của mình (chống IDOR). */
    @Transactional
    public NotificationDto markRead(UUID userId, UUID id) {
        Notification n = repository.findById(id)
                .filter(x -> x.getUserId().equals(userId))
                .orElseThrow(() -> AppException.notFound("NOTIFICATION_NOT_FOUND", "Notification not found"));
        n.setRead(true);
        return NotificationDto.from(repository.save(n));
    }

    @Transactional
    public int markAllRead(UUID userId) {
        return repository.markAllRead(userId);
    }
}
