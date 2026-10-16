package com.lifely.notify;

import com.lifely.notification.NotificationService;
import com.lifely.notification.NotificationType;
import com.lifely.request.BloodRequest;
import com.lifely.request.Urgency;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Cảnh báo cho nhân viên của đúng cơ sở được gắn với yêu cầu (chủ + nhân viên của tổ chức đó), không gửi cho cơ sở khác.
 * In-app luôn có; SMS (mock) / Web Push chỉ khi kênh bật và nhân viên đã đồng ý. Không có cuộc gọi tự động.
 */
@Service
public class StaffAlertService {

    private final JdbcTemplate jdbc;
    private final NotificationService notifications;
    private final OutboxService outbox;

    public StaffAlertService(JdbcTemplate jdbc, NotificationService notifications, OutboxService outbox) {
        this.jdbc = jdbc;
        this.notifications = notifications;
        this.outbox = outbox;
    }

    public List<UUID> staffOf(UUID organizationId) {
        return jdbc.queryForList("""
                SELECT owner_user_id FROM organizations WHERE id = ?
                UNION
                SELECT user_id FROM organization_members WHERE organization_id = ?
                """, UUID.class, organizationId, organizationId);
    }

    /** Yêu cầu mới gắn với cơ sở: báo cho nhân viên (trừ chính người tạo). Gọi trong transaction tạo yêu cầu. */
    @Transactional
    public int notifyNewRequest(BloodRequest r) {
        if (r.getOrganizationId() == null) {
            return 0;
        }
        int n = 0;
        for (UUID staff : staffOf(r.getOrganizationId())) {
            if (staff.equals(r.getRequesterId())) {
                continue;
            }
            notifications.notify(staff, NotificationType.STAFF_NEW_REQUEST, "Yêu cầu máu mới tại cơ sở của bạn",
                    "Nhóm " + r.getBloodType().getCode() + ", " + r.getUnitsRequired() + " đơn vị, mức "
                            + label(r.getUrgency()) + ". Hãy xác nhận hoặc từ chối trong mục Yêu cầu.",
                    "REQUEST", r.getId());
            String text = outbox.staffAlertSms(r.getBloodType().getCode(), r.getUnitsRequired());
            outbox.enqueue(staff, OutboxService.Channel.SMS, OutboxService.PURPOSE_STAFF_ALERT, "REQUEST", r.getId(),
                    text, "SMS:STAFF:" + r.getId() + ":" + staff);
            outbox.enqueuePush(staff, OutboxService.PURPOSE_STAFF_ALERT, "REQUEST", r.getId(), "Yêu cầu máu mới tại cơ sở",
                    "Nhóm " + r.getBloodType().getCode() + ", " + r.getUnitsRequired() + " đơn vị. Hãy xác nhận hoặc từ chối.",
                    "/organization/requests/" + r.getId(), "PUSH:STAFF:" + r.getId() + ":" + staff);
            n++;
        }
        return n;
    }

    /** Có người hiến nhận lời: báo in-app cho nhân viên cơ sở (không kèm thông tin cá nhân người hiến). */
    @Transactional
    public void notifyDonorResponded(BloodRequest r, int confirmed) {
        if (r.getOrganizationId() == null) {
            return;
        }
        for (UUID staff : staffOf(r.getOrganizationId())) {
            if (staff.equals(r.getRequesterId())) {
                continue;
            }
            notifications.notify(staff, NotificationType.STAFF_DONOR_RESPONDED, "Có người hiến nhận lời",
                    "Yêu cầu " + r.getBloodType().getCode() + " hiện có " + confirmed + " / " + r.getUnitsRequired()
                            + " người nhận lời. Đây chưa phải lượng máu đã hiến; hãy liên hệ và hướng dẫn người hiến.",
                    "REQUEST", r.getId());
        }
    }

    private static String label(Urgency u) {
        return switch (u) {
            case CRITICAL -> "rất khẩn cấp";
            case URGENT -> "khẩn cấp";
            case NORMAL -> "bình thường";
        };
    }
}
