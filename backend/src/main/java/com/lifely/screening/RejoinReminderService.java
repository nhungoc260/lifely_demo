package com.lifely.screening;

import com.lifely.matching.MatchingProperties;
import com.lifely.notification.NotificationService;
import com.lifely.notification.NotificationType;
import com.lifely.notify.OutboxService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Nhắc "bạn đã có thể hiến máu lại" khi đủ giãn cách. Mỗi lần hiến chỉ nhắc MỘT lần: cột rejoin_reminded_for được cập nhật
 * nguyên tử bằng UPDATE ... RETURNING nên nhiều tiến trình / chạy lặp không nhắc trùng. Chỉ nhắc người đã bật loại nhắc này
 * (độc lập với thông báo khẩn cấp). Chỉ nhắc khi ngày đủ điều kiện nằm trong 7 ngày gần nhất để không "bắn hàng loạt" dữ liệu cũ.
 */
@Service
public class RejoinReminderService {

    static final int LOOKBACK_DAYS = 7;

    private final JdbcTemplate jdbc;
    private final MatchingProperties matching;
    private final NotificationService notifications;
    private final OutboxService outbox;

    public RejoinReminderService(JdbcTemplate jdbc, MatchingProperties matching, NotificationService notifications,
                                 OutboxService outbox) {
        this.jdbc = jdbc;
        this.matching = matching;
        this.notifications = notifications;
        this.outbox = outbox;
    }

    @Transactional
    public int sendDue(LocalDate today) {
        RejoinPolicy policy = matching.rejoinPolicy();
        List<Object[]> due = jdbc.query("""
                UPDATE donor_profiles d SET rejoin_reminded_for = d.last_donation_date
                  FROM privacy_settings p, users u
                 WHERE p.user_id = d.user_id AND u.id = d.user_id AND u.status = 'ACTIVE'
                   AND p.receive_rejoin_reminders
                   AND d.last_donation_date IS NOT NULL
                   AND d.rejoin_reminded_for IS DISTINCT FROM d.last_donation_date
                   AND d.last_donation_date + (CASE WHEN d.gender = 'FEMALE' THEN ? ELSE ? END) <= ?
                   AND d.last_donation_date + (CASE WHEN d.gender = 'FEMALE' THEN ? ELSE ? END) >= ?
                RETURNING d.id, d.user_id, d.last_donation_date
                """, (rs, i) -> new Object[]{rs.getObject("id", UUID.class), rs.getObject("user_id", UUID.class),
                rs.getDate("last_donation_date").toLocalDate()},
                policy.daysFor("FEMALE"), policy.daysFor("MALE"), Date.valueOf(today),
                policy.daysFor("FEMALE"), policy.daysFor("MALE"), Date.valueOf(today.minusDays(LOOKBACK_DAYS)));
        for (Object[] d : due) {
            UUID donorId = (UUID) d[0];
            UUID userId = (UUID) d[1];
            LocalDate last = (LocalDate) d[2];
            notifications.notify(userId, NotificationType.REJOIN_REMINDER, "Bạn đã có thể hiến máu lại",
                    "Đã đủ thời gian giãn cách kể từ lần hiến gần nhất. Nếu sẵn sàng, bạn có thể đặt lịch hiến. "
                            + "Cơ sở y tế sẽ sàng lọc khi bạn đến.", "HEALTH", donorId);
            outbox.enqueuePush(userId, OutboxService.PURPOSE_REJOIN, "DONOR", donorId, "Bạn đã có thể hiến máu lại",
                    "Đã đủ thời gian giãn cách. Mở LIFELY để đặt lịch hiến.", "/donor/appointments",
                    "PUSH:REJOIN:" + donorId + ":" + last);
        }
        return due.size();
    }
}
