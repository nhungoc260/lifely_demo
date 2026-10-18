package com.lifely.admin;

import com.lifely.notification.NotificationService;
import com.lifely.notification.NotificationType;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class AdminAlertsTest {

    @Test
    void raisePublishesOneEventWithTheGivenContent() {
        List<Object> published = new ArrayList<>();
        AdminAlerts alerts = new AdminAlerts(published::add);
        UUID ref = UUID.randomUUID();
        alerts.raise("Báo cáo vi phạm mới", "nội dung", "REPORT", ref);
        assertEquals(1, published.size());
        assertEquals(new AdminAlerts.Event("Báo cáo vi phạm mới", "nội dung", "REPORT", ref), published.get(0));
    }

    @Test
    void deliverNotifiesEveryAdminAndOneFailureDoesNotStopTheOthers() {
        NotificationService notifications = mock(NotificationService.class);
        UUID a = UUID.randomUUID();
        UUID b = UUID.randomUUID();
        UUID ref = UUID.randomUUID();
        doThrow(new RuntimeException("lỗi giả lập")).when(notifications)
                .notify(eq(a), any(NotificationType.class), anyString(), anyString(), anyString(), any(UUID.class));

        new AdminAlertListener(null, notifications)
                .deliver(List.of(a, b), new AdminAlerts.Event("t", "m", "REPORT", ref));

        verify(notifications).notify(a, NotificationType.SYSTEM, "t", "m", "REPORT", ref);
        verify(notifications).notify(b, NotificationType.SYSTEM, "t", "m", "REPORT", ref);
    }
}
