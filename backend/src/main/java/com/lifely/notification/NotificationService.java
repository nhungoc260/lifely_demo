package com.lifely.notification;

import com.lifely.common.AppException;
import com.lifely.common.PageResponse;
import com.lifely.mail.MailService;
import com.lifely.realtime.NotificationCreatedEvent;
import com.lifely.user.PrivacySettings;
import com.lifely.user.PrivacySettingsRepository;
import com.lifely.user.UserRepository;
import com.lifely.user.UserStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.Set;
import java.util.UUID;

@Service
public class NotificationService {

    /** Chỉ các thông báo cần người hiến phản hồi nhanh mới gửi thêm email (tránh spam hộp thư). */
    private static final Set<NotificationType> EMAIL_TYPES =
            Set.of(NotificationType.NEW_MATCH, NotificationType.EMERGENCY_ESCALATION);

    private final NotificationRepository repository;
    private final ApplicationEventPublisher events;
    private final MailService mailService;
    private final UserRepository userRepository;
    private final PrivacySettingsRepository privacyRepository;
    private final String frontendUrl;

    public NotificationService(NotificationRepository repository, ApplicationEventPublisher events,
                               MailService mailService, UserRepository userRepository,
                               PrivacySettingsRepository privacyRepository,
                               @Value("${lifely.frontend-url:http://localhost:3000}") String frontendUrl) {
        this.repository = repository;
        this.events = events;
        this.mailService = mailService;
        this.userRepository = userRepository;
        this.privacyRepository = privacyRepository;
        this.frontendUrl = frontendUrl;
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
                repository.countByUserIdAndReadFlagFalse(userId)));
        emailAfterCommit(userId, type, title, message);
    }

    /**
     * Gửi thêm email cho thông báo khẩn (người hiến không cần mở web mới biết). Chỉ gửi sau khi transaction commit,
     * chỉ khi SMTP đã cấu hình, và tôn trọng cài đặt "nhận thông báo khẩn cấp" của người dùng.
     */
    private void emailAfterCommit(UUID userId, NotificationType type, String title, String message) {
        if (!EMAIL_TYPES.contains(type) || !mailService.isEnabled()) {
            return;
        }
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    sendEmail(userId, title, message);
                }
            });
        } else {
            sendEmail(userId, title, message);
        }
    }

    private void sendEmail(UUID userId, String title, String message) {
        userRepository.findById(userId).ifPresent(user -> {
            String email = user.getEmail();
            // Không gửi cho tài khoản bị khóa/đã xóa và các địa chỉ demo (@lifely.demo không có hộp thư thật).
            if (user.getStatus() != UserStatus.ACTIVE || email.endsWith("@lifely.demo") || email.endsWith(".invalid")) {
                return;
            }
            boolean allowed = privacyRepository.findById(userId)
                    .map(PrivacySettings::isReceiveEmergencyNotifications).orElse(true);
            if (!allowed) {
                return;
            }
            mailService.send(email, "[LIFELY] " + title,
                    "Xin chào " + user.getFullName() + ",\n\n" + message
                            + "\n\nMở LIFELY để xem và phản hồi: " + frontendUrl + "/donor/notifications"
                            + "\n\nLưu ý: LIFELY chỉ hỗ trợ điều phối. Việc bạn có đủ điều kiện hiến máu hay không"
                            + " do nhân viên y tế quyết định."
                            + "\nBạn có thể tắt email này trong Hồ sơ > Quyền riêng tư.");
        });
    }

    @Transactional(readOnly = true)
    public PageResponse<NotificationDto> list(UUID userId, boolean unreadOnly, int page, int size) {
        PageRequest pr = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50));
        Page<Notification> result = unreadOnly
                ? repository.findByUserIdAndReadFlagFalseOrderByCreatedAtDesc(userId, pr)
                : repository.findByUserIdOrderByCreatedAtDesc(userId, pr);
        return PageResponse.of(result, NotificationDto::from);
    }

    @Transactional(readOnly = true)
    public long unreadCount(UUID userId) {
        return repository.countByUserIdAndReadFlagFalse(userId);
    }

    /** Chỉ chủ sở hữu mới đánh dấu đã đọc được thông báo của mình (chống IDOR). */
    @Transactional
    public NotificationDto markRead(UUID userId, UUID id) {
        Notification n = repository.findById(id)
                .filter(x -> x.getUserId().equals(userId))
                .orElseThrow(() -> AppException.notFound("NOTIFICATION_NOT_FOUND", "Không tìm thấy thông báo"));
        n.setReadFlag(true);
        return NotificationDto.from(repository.save(n));
    }

    @Transactional
    public int markAllRead(UUID userId) {
        return repository.markAllRead(userId);
    }
}
