package com.lifely.realtime;

import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Đẩy sự kiện qua WebSocket CHỈ SAU KHI transaction commit, để client không bao giờ nhận
 * dữ liệu của một giao dịch sau đó bị rollback.
 */
@Component
public class RealtimePublisher {

    private final SimpMessagingTemplate messaging;

    public RealtimePublisher(SimpMessagingTemplate messaging) {
        this.messaging = messaging;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onRequestChanged(RequestChangedEvent e) {
        messaging.convertAndSend("/topic/requests/" + e.requestId(), e);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onNotification(NotificationCreatedEvent e) {
        messaging.convertAndSendToUser(e.userId().toString(), "/queue/notifications", e);
    }
}
