package com.lifely.admin;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Báo cho MỌI quản trị viên đang hoạt động khi có việc cần admin xử lý (báo cáo vi phạm mới, tổ chức chờ xác minh,
 * yêu cầu máu chờ xác minh, tin nhắn liên hệ...). Thông báo được lưu vào bảng notifications (hiện ở chuông của admin,
 * đẩy realtime qua cơ chế sẵn có) và CHỈ được tạo sau khi giao dịch nghiệp vụ đã commit, trong giao dịch riêng:
 * lỗi khi báo admin không bao giờ làm hỏng việc tạo yêu cầu, báo cáo hay tin nhắn của người dùng.
 */
@Component
public class AdminAlerts {

    public record Event(String title, String message, String referenceType, UUID referenceId) {
    }

    private final ApplicationEventPublisher publisher;

    public AdminAlerts(ApplicationEventPublisher publisher) {
        this.publisher = publisher;
    }

    public void raise(String title, String message, String referenceType, UUID referenceId) {
        publisher.publishEvent(new Event(title, message, referenceType, referenceId));
    }
}
