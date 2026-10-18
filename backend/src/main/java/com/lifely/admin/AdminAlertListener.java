package com.lifely.admin;

import com.lifely.notification.NotificationService;
import com.lifely.notification.NotificationType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.List;
import java.util.UUID;

/** Tạo thông báo cho từng admin sau khi giao dịch gốc commit. Dùng loại SYSTEM nên không cần đổi schema. */
@Component
class AdminAlertListener {

    private static final Logger log = LoggerFactory.getLogger(AdminAlertListener.class);

    private final JdbcTemplate jdbc;
    private final NotificationService notifications;

    AdminAlertListener(JdbcTemplate jdbc, NotificationService notifications) {
        this.jdbc = jdbc;
        this.notifications = notifications;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onAlert(AdminAlerts.Event e) {
        List<UUID> admins = jdbc.query("""
                SELECT u.id FROM users u
                JOIN user_roles ur ON ur.user_id = u.id
                JOIN roles r ON r.id = ur.role_id
                WHERE r.name = 'ROLE_ADMIN' AND u.status = 'ACTIVE'
                """, (rs, i) -> rs.getObject(1, UUID.class));
        deliver(admins, e);
    }

    /** Gửi cho từng admin; lỗi với một người không chặn những người còn lại. */
    void deliver(List<UUID> admins, AdminAlerts.Event e) {
        for (UUID admin : admins) {
            try {
                notifications.notify(admin, NotificationType.SYSTEM, e.title(), e.message(), e.referenceType(), e.referenceId());
            } catch (RuntimeException ex) {
                log.warn("Không báo được cho admin {}: {}", admin, ex.getClass().getSimpleName());
            }
        }
    }
}
