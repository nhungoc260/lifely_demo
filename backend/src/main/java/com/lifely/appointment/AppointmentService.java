package com.lifely.appointment;

import com.lifely.appointment.AppointmentDtos.Action;
import com.lifely.appointment.AppointmentDtos.AppointmentDto;
import com.lifely.appointment.AppointmentDtos.CreateSlotRequest;
import com.lifely.appointment.AppointmentDtos.OrgAppointmentDto;
import com.lifely.appointment.AppointmentDtos.SlotDto;
import com.lifely.audit.AuditService;
import com.lifely.auth.AuthUser;
import com.lifely.common.AppException;
import com.lifely.donor.DonorProfile;
import com.lifely.donor.DonorProfileRepository;
import com.lifely.inventory.InventoryService;
import com.lifely.matching.MatchingProperties;
import com.lifely.notification.NotificationService;
import com.lifely.notification.NotificationType;
import com.lifely.notify.NotifyProperties;
import com.lifely.notify.OutboxService;
import com.lifely.organization.Organization;
import com.lifely.organization.OrganizationRepository;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Luồng B: đặt lịch hiến máu trước. TÁCH BẠCH với yêu cầu máu khẩn cấp (Luồng A) và với kho máu.
 * - Chỗ trống được giữ bằng MỘT câu UPDATE có điều kiện (booked_count < capacity) nên không bao giờ vượt sức chứa;
 *   CHECK constraint ở DB là lưới an toàn cuối cùng.
 * - Lịch hẹn KHÔNG phải máu có sẵn: kho máu chỉ đổi khi nhân viên cơ sở đã xác minh chuyển lịch sang DONATED.
 */
@Service
public class AppointmentService {

    /** Chỉ được hủy lịch trước giờ hẹn ít nhất khoảng này. Quy tắc điều phối, cần cơ sở y tế xác nhận. */
    public static final Duration CANCEL_CUTOFF = Duration.ofHours(2);
    private static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter WHEN = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy").withZone(ZONE);
    private static final String ACTIVE_APPT = "('BOOKED','CHECKED_IN','SCREENED')";

    private final JdbcTemplate jdbc;
    private final DonorProfileRepository donors;
    private final OrganizationRepository organizations;
    private final NotificationService notifications;
    private final OutboxService outbox;
    private final InventoryService inventory;
    private final AuditService audit;
    private final MatchingProperties matching;
    private final NotifyProperties notifyProps;

    public AppointmentService(JdbcTemplate jdbc, DonorProfileRepository donors, OrganizationRepository organizations,
                              NotificationService notifications, OutboxService outbox, InventoryService inventory,
                              AuditService audit, MatchingProperties matching, NotifyProperties notifyProps) {
        this.jdbc = jdbc;
        this.donors = donors;
        this.organizations = organizations;
        this.notifications = notifications;
        this.outbox = outbox;
        this.inventory = inventory;
        this.audit = audit;
        this.matching = matching;
        this.notifyProps = notifyProps;
    }

    // ------------------------------------------------------------------ người hiến

    @Transactional(readOnly = true)
    public List<SlotDto> openSlots(UUID organizationId, int days) {
        int range = Math.min(Math.max(days, 1), 90);
        StringBuilder sql = new StringBuilder("""
                SELECT s.id, s.organization_id, o.name, o.address, o.city, s.starts_at, s.ends_at,
                       s.capacity, s.booked_count, s.status
                  FROM donation_slots s JOIN organizations o ON o.id = s.organization_id
                 WHERE s.status = 'ACTIVE' AND s.starts_at > now()
                   AND s.starts_at < now() + (? * interval '1 day') AND o.verification_status = 'VERIFIED'
                """);
        List<Object> args = new ArrayList<>();
        args.add(range);
        if (organizationId != null) {
            sql.append(" AND s.organization_id = ?");
            args.add(organizationId);
        }
        sql.append(" ORDER BY s.starts_at LIMIT 200");
        return jdbc.query(sql.toString(), (rs, i) -> slot(rs), args.toArray());
    }

    @Transactional
    public AppointmentDto book(AuthUser user, UUID slotId) {
        DonorProfile donor = donors.findByUserId(user.getId())
                .orElseThrow(() -> AppException.notFound("DONOR_PROFILE_NOT_FOUND", "Không tìm thấy hồ sơ người hiến máu"));
        List<SlotDto> found = jdbc.query("""
                SELECT s.id, s.organization_id, o.name, o.address, o.city, s.starts_at, s.ends_at,
                       s.capacity, s.booked_count, s.status
                  FROM donation_slots s JOIN organizations o ON o.id = s.organization_id
                 WHERE s.id = ? AND o.verification_status = 'VERIFIED'
                """, (rs, i) -> slot(rs), slotId);
        if (found.isEmpty()) {
            throw AppException.notFound("SLOT_NOT_FOUND", "Không tìm thấy khung giờ hiến máu");
        }
        SlotDto slot = found.get(0);
        if (!"ACTIVE".equals(slot.status()) || !slot.startsAt().isAfter(Instant.now())) {
            throw AppException.conflict("SLOT_CLOSED", "Khung giờ này đã đóng hoặc đã qua");
        }
        LocalDate slotDate = slot.startsAt().atZone(ZONE).toLocalDate();
        if (!matching.rejoinPolicy().canDonate(donor.getLastDonationDate(), donor.getGender(), slotDate)) {
            throw AppException.conflict("TOO_SOON_AFTER_LAST_DONATION",
                    "Lần hiến gần nhất của bạn còn quá gần ngày này. Hãy chọn ngày muộn hơn; cơ sở y tế sẽ quyết định khi sàng lọc.");
        }
        Integer overlap = jdbc.queryForObject("""
                SELECT count(*) FROM appointments a JOIN donation_slots s2 ON s2.id = a.slot_id
                 WHERE a.donor_id = ? AND a.status IN ('BOOKED','CHECKED_IN','SCREENED')
                   AND s2.starts_at < ? AND s2.ends_at > ?
                """, Integer.class, donor.getId(), Timestamp.from(slot.endsAt()), Timestamp.from(slot.startsAt()));
        if (overlap != null && overlap > 0) {
            throw AppException.conflict("APPOINTMENT_OVERLAP", "Bạn đã có một lịch hiến máu trùng thời gian này");
        }
        // Giữ chỗ nguyên tử: chỉ thành công khi còn chỗ. Người đến sau nhận 0 dòng và bị từ chối rõ ràng.
        int seat = jdbc.update("""
                UPDATE donation_slots SET booked_count = booked_count + 1
                 WHERE id = ? AND status = 'ACTIVE' AND booked_count < capacity AND starts_at > now()
                """, slotId);
        if (seat == 0) {
            throw AppException.conflict("SLOT_FULL", "Khung giờ này vừa hết chỗ. Hãy chọn khung giờ khác.");
        }
        UUID id;
        try {
            id = jdbc.queryForObject("INSERT INTO appointments (slot_id, donor_id) VALUES (?, ?) RETURNING id",
                    UUID.class, slotId, donor.getId());
        } catch (DuplicateKeyException e) {
            // Transaction bị rollback cùng bước giữ chỗ ở trên.
            throw AppException.conflict("ALREADY_BOOKED", "Bạn đã đặt khung giờ này rồi");
        }
        String when = WHEN.format(slot.startsAt());
        notifications.notify(user.getId(), NotificationType.APPOINTMENT_CONFIRMED, "Đã đặt lịch hiến máu",
                "Lịch của bạn tại " + slot.organizationName() + " lúc " + when + " đã được ghi nhận. "
                        + "Đây là lịch hẹn, chưa phải xác nhận đủ điều kiện hiến máu; cơ sở sẽ sàng lọc khi bạn đến.",
                "APPOINTMENT", id);
        outbox.enqueuePush(user.getId(), OutboxService.PURPOSE_APPT_CONFIRM, "APPOINTMENT", id, "Đã đặt lịch hiến máu",
                "Lịch lúc " + when + " tại " + slot.organizationName() + ".", "/donor/appointments", "PUSH:APPT_CONFIRM:" + id);
        outbox.enqueue(user.getId(), OutboxService.Channel.SMS, OutboxService.PURPOSE_APPT_CONFIRM, "APPOINTMENT", id,
                outbox.appointmentSms(when, slot.organizationName(), false), "SMS:APPT_CONFIRM:" + id);
        audit.log(user.getId(), "APPOINTMENT_BOOKED", "APPOINTMENT", id, Map.of("slotId", slotId.toString()));
        return mineOne(donor.getId(), id);
    }

    @Transactional(readOnly = true)
    public List<AppointmentDto> mine(AuthUser user) {
        DonorProfile donor = donors.findByUserId(user.getId())
                .orElseThrow(() -> AppException.notFound("DONOR_PROFILE_NOT_FOUND", "Không tìm thấy hồ sơ người hiến máu"));
        return jdbc.query(mineSql("a.donor_id = ?", "ORDER BY s.starts_at DESC LIMIT 100"),
                (rs, i) -> appointment(rs), donor.getId());
    }

    @Transactional
    public AppointmentDto cancel(AuthUser user, UUID appointmentId) {
        DonorProfile donor = donors.findByUserId(user.getId())
                .orElseThrow(() -> AppException.notFound("DONOR_PROFILE_NOT_FOUND", "Không tìm thấy hồ sơ người hiến máu"));
        List<Object[]> rows = jdbc.query("""
                SELECT a.slot_id, s.starts_at, o.name FROM appointments a
                  JOIN donation_slots s ON s.id = a.slot_id JOIN organizations o ON o.id = s.organization_id
                 WHERE a.id = ? AND a.donor_id = ? FOR UPDATE OF a
                """, (rs, i) -> new Object[]{rs.getObject("slot_id", UUID.class),
                rs.getTimestamp("starts_at").toInstant(), rs.getString("name")}, appointmentId, donor.getId());
        if (rows.isEmpty()) {
            throw AppException.notFound("APPOINTMENT_NOT_FOUND", "Không tìm thấy lịch hẹn");   // chống IDOR: 404
        }
        UUID slotId = (UUID) rows.get(0)[0];
        Instant startsAt = (Instant) rows.get(0)[1];
        if (startsAt.minus(CANCEL_CUTOFF).isBefore(Instant.now())) {
            throw AppException.conflict("CANCEL_TOO_LATE", "Chỉ có thể hủy lịch trước giờ hẹn ít nhất "
                    + CANCEL_CUTOFF.toHours() + " giờ");
        }
        int n = jdbc.update("UPDATE appointments SET status = 'CANCELLED', cancelled_at = now() WHERE id = ? AND status = 'BOOKED'",
                appointmentId);
        if (n == 0) {
            throw AppException.conflict("INVALID_STATE", "Lịch hẹn này không còn có thể hủy");
        }
        jdbc.update("UPDATE donation_slots SET booked_count = booked_count - 1 WHERE id = ? AND booked_count > 0", slotId);
        notifications.notify(user.getId(), NotificationType.APPOINTMENT_CANCELLED, "Đã hủy lịch hiến máu",
                "Lịch hiến máu lúc " + WHEN.format(startsAt) + " tại " + rows.get(0)[2] + " đã được hủy. Bạn có thể đặt khung giờ khác.",
                "APPOINTMENT", appointmentId);
        audit.log(user.getId(), "APPOINTMENT_CANCELLED", "APPOINTMENT", appointmentId);
        return mineOne(donor.getId(), appointmentId);
    }

    // ------------------------------------------------------------------ nhân viên cơ sở

    @Transactional
    public SlotDto createSlot(AuthUser user, CreateSlotRequest req) {
        Organization org = verifiedOrg(user);
        Instant now = Instant.now();
        if (!req.endsAt().isAfter(req.startsAt())) {
            throw AppException.badRequest("INVALID_SLOT_TIME", "Giờ kết thúc phải sau giờ bắt đầu");
        }
        if (req.startsAt().isBefore(now.plus(Duration.ofMinutes(30)))) {
            throw AppException.badRequest("INVALID_SLOT_TIME", "Khung giờ phải bắt đầu sau hiện tại ít nhất 30 phút");
        }
        if (req.startsAt().isAfter(now.plus(Duration.ofDays(90)))) {
            throw AppException.badRequest("INVALID_SLOT_TIME", "Chỉ mở lịch trong vòng 90 ngày tới");
        }
        if (Duration.between(req.startsAt(), req.endsAt()).compareTo(Duration.ofHours(8)) > 0) {
            throw AppException.badRequest("INVALID_SLOT_TIME", "Một khung giờ không dài quá 8 giờ");
        }
        UUID id;
        try {
            id = jdbc.queryForObject("""
                    INSERT INTO donation_slots (organization_id, starts_at, ends_at, capacity, created_by)
                    VALUES (?, ?, ?, ?, ?) RETURNING id
                    """, UUID.class, org.getId(), Timestamp.from(req.startsAt()), Timestamp.from(req.endsAt()),
                    req.capacity(), user.getId());
        } catch (DuplicateKeyException e) {
            throw AppException.conflict("SLOT_EXISTS", "Đã có khung giờ bắt đầu vào thời điểm này");
        }
        audit.log(user.getId(), "SLOT_CREATED", "SLOT", id, Map.of("capacity", req.capacity()));
        return jdbc.query(slotSql("s.id = ?"), (rs, i) -> slot(rs), id).get(0);
    }

    @Transactional(readOnly = true)
    public List<SlotDto> orgSlots(AuthUser user) {
        Organization org = orgOf(user);
        return jdbc.query(slotSql("s.organization_id = ? AND s.starts_at > now() - interval '7 days'")
                + " ORDER BY s.starts_at LIMIT 300", (rs, i) -> slot(rs), org.getId());
    }

    /** Đóng khung giờ: chặn đặt mới. Các lịch đã đặt vẫn được xử lý bình thường. */
    @Transactional
    public SlotDto closeSlot(AuthUser user, UUID slotId) {
        Organization org = orgOf(user);
        int n = jdbc.update("UPDATE donation_slots SET status = 'CLOSED' WHERE id = ? AND organization_id = ? AND status = 'ACTIVE'",
                slotId, org.getId());
        if (n == 0) {
            throw AppException.notFound("SLOT_NOT_FOUND", "Không tìm thấy khung giờ đang mở của cơ sở");
        }
        audit.log(user.getId(), "SLOT_CLOSED", "SLOT", slotId);
        return jdbc.query(slotSql("s.id = ?"), (rs, i) -> slot(rs), slotId).get(0);
    }

    @Transactional(readOnly = true)
    public List<OrgAppointmentDto> orgAppointments(AuthUser user, UUID slotId) {
        Organization org = orgOf(user);
        return jdbc.query("""
                SELECT a.id, a.slot_id, u.full_name, bt.code, a.status, s.starts_at, a.handled_at, a.created_at
                  FROM appointments a
                  JOIN donation_slots s ON s.id = a.slot_id
                  JOIN donor_profiles dp ON dp.id = a.donor_id
                  JOIN users u ON u.id = dp.user_id
                  LEFT JOIN blood_types bt ON bt.id = dp.blood_type_id
                 WHERE a.slot_id = ? AND s.organization_id = ?
                 ORDER BY a.created_at
                """, (rs, i) -> new OrgAppointmentDto(rs.getObject("id", UUID.class), rs.getObject("slot_id", UUID.class),
                rs.getString("full_name"), rs.getString("code"), rs.getString("status"),
                rs.getTimestamp("starts_at").toInstant(), instant(rs.getTimestamp("handled_at")),
                rs.getTimestamp("created_at").toInstant()), slotId, org.getId());
    }

    /**
     * Chuyển trạng thái lịch hẹn. Chỉ nhân viên của đúng cơ sở (đã xác minh) được thao tác.
     * BOOKED -> CHECKED_IN | NO_SHOW;  CHECKED_IN -> SCREENED | DEFERRED;  SCREENED -> DONATED | DEFERRED.
     * DONATED mới ghi lịch sử hiến, cập nhật hồ sơ người hiến và (nếu cơ sở bật) cộng kho máu.
     */
    @Transactional
    public OrgAppointmentDto transition(AuthUser user, UUID appointmentId, Action action) {
        Organization org = verifiedOrg(user);
        List<Object[]> rows = jdbc.query("""
                SELECT a.status, a.donor_id, s.starts_at FROM appointments a
                  JOIN donation_slots s ON s.id = a.slot_id
                 WHERE a.id = ? AND s.organization_id = ? FOR UPDATE OF a
                """, (rs, i) -> new Object[]{rs.getString("status"), rs.getObject("donor_id", UUID.class),
                rs.getTimestamp("starts_at").toInstant()}, appointmentId, org.getId());
        if (rows.isEmpty()) {
            throw AppException.notFound("APPOINTMENT_NOT_FOUND", "Không tìm thấy lịch hẹn của cơ sở");
        }
        String from = (String) rows.get(0)[0];
        UUID donorId = (UUID) rows.get(0)[1];
        Instant startsAt = (Instant) rows.get(0)[2];
        String to = nextStatus(from, action);
        if (to == null) {
            throw AppException.conflict("INVALID_TRANSITION", "Không thể chuyển lịch hẹn từ " + from + " với thao tác " + action);
        }
        if (action == Action.NO_SHOW && startsAt.isAfter(Instant.now())) {
            throw AppException.conflict("TOO_EARLY", "Chỉ đánh dấu không đến sau giờ hẹn");
        }
        UUID donationId = null;
        if (action == Action.DONATED) {
            donationId = recordDonation(user, org, donorId, appointmentId);
        }
        int n = jdbc.update("""
                UPDATE appointments SET status = ?, handled_by = ?, handled_at = now(),
                       donation_id = COALESCE(?, donation_id)
                 WHERE id = ? AND status = ?
                """, to, user.getId(), donationId, appointmentId, from);
        if (n == 0) {
            throw AppException.conflict("INVALID_STATE", "Lịch hẹn vừa được cập nhật bởi người khác");
        }
        audit.log(user.getId(), "APPOINTMENT_" + to, "APPOINTMENT", appointmentId, Map.of("from", from));
        return jdbc.query("""
                SELECT a.id, a.slot_id, u.full_name, bt.code, a.status, s.starts_at, a.handled_at, a.created_at
                  FROM appointments a JOIN donation_slots s ON s.id = a.slot_id
                  JOIN donor_profiles dp ON dp.id = a.donor_id JOIN users u ON u.id = dp.user_id
                  LEFT JOIN blood_types bt ON bt.id = dp.blood_type_id WHERE a.id = ?
                """, (rs, i) -> new OrgAppointmentDto(rs.getObject("id", UUID.class), rs.getObject("slot_id", UUID.class),
                rs.getString("full_name"), rs.getString("code"), rs.getString("status"),
                rs.getTimestamp("starts_at").toInstant(), instant(rs.getTimestamp("handled_at")),
                rs.getTimestamp("created_at").toInstant()), appointmentId).get(0);
    }

    static String nextStatus(String from, Action action) {
        return switch (from) {
            case "BOOKED" -> switch (action) {
                case CHECK_IN -> "CHECKED_IN";
                case NO_SHOW -> "NO_SHOW";
                default -> null;
            };
            case "CHECKED_IN" -> switch (action) {
                case SCREEN_PASS -> "SCREENED";
                case DEFER -> "DEFERRED";
                default -> null;
            };
            case "SCREENED" -> switch (action) {
                case DONATED -> "DONATED";
                case DEFER -> "DEFERRED";
                default -> null;
            };
            default -> null;
        };
    }

    private UUID recordDonation(AuthUser user, Organization org, UUID donorId, UUID appointmentId) {
        LocalDate today = LocalDate.now(ZONE);
        UUID historyId = jdbc.queryForObject("""
                INSERT INTO donation_history (donor_id, donated_on, location, source, verification_level,
                       confirmed_by_user_id, confirmed_by_org_id, confirmed_by_org_name, confirmed_at)
                VALUES (?, ?, ?, 'APPOINTMENT', 'ORG_VERIFIED', ?, ?, ?, now()) RETURNING id
                """, UUID.class, donorId, java.sql.Date.valueOf(today), org.getName(), user.getId(), org.getId(), org.getName());
        jdbc.update("UPDATE donor_profiles SET total_donations = total_donations + 1, last_donation_date = ? WHERE id = ?",
                java.sql.Date.valueOf(today), donorId);
        List<String> info = jdbc.query("""
                SELECT bt.code FROM donor_profiles dp LEFT JOIN blood_types bt ON bt.id = dp.blood_type_id WHERE dp.id = ?
                """, (rs, i) -> rs.getString("code"), donorId);
        String blood = info.isEmpty() ? null : info.get(0);
        inventory.addDonatedUnit(org.getId(), blood, "APPOINTMENT", appointmentId, user.getId());
        UUID donorUser = jdbc.queryForObject("SELECT user_id FROM donor_profiles WHERE id = ?", UUID.class, donorId);
        notifications.notify(donorUser, NotificationType.SYSTEM, "Cảm ơn bạn đã hiến máu",
                "Lần hiến máu của bạn tại " + org.getName() + " đã được cơ sở xác nhận.", "APPOINTMENT", appointmentId);
        return historyId;
    }

    // ------------------------------------------------------------------ nhắc lịch

    /**
     * Nhắc các lịch BOOKED sắp tới giờ. Đánh dấu reminder_sent_at bằng UPDATE ... RETURNING nên mỗi lịch chỉ được
     * nhận một lần nhắc kể cả khi có nhiều tiến trình cùng chạy.
     */
    @Transactional
    public int sendDueReminders() {
        List<Object[]> due = jdbc.query("""
                UPDATE appointments a SET reminder_sent_at = now() FROM donation_slots s
                 WHERE a.slot_id = s.id AND a.status = 'BOOKED' AND a.reminder_sent_at IS NULL
                   AND s.status = 'ACTIVE' AND s.starts_at > now()
                   AND s.starts_at <= now() + (? * interval '1 hour')
                RETURNING a.id, a.donor_id, s.starts_at, s.organization_id
                """, (rs, i) -> new Object[]{rs.getObject("id", UUID.class), rs.getObject("donor_id", UUID.class),
                rs.getTimestamp("starts_at").toInstant(), rs.getObject("organization_id", UUID.class)},
                notifyProps.getAppointmentReminderHours());
        for (Object[] d : due) {
            UUID apptId = (UUID) d[0];
            Instant startsAt = (Instant) d[2];
            List<UUID> userIds = jdbc.queryForList("SELECT user_id FROM donor_profiles WHERE id = ?", UUID.class, d[1]);
            List<String> orgNames = jdbc.queryForList("SELECT name FROM organizations WHERE id = ?", String.class, d[3]);
            if (userIds.isEmpty() || orgNames.isEmpty()) {
                continue;
            }
            String when = WHEN.format(startsAt);
            notifications.notify(userIds.get(0), NotificationType.APPOINTMENT_REMINDER, "Nhắc lịch hiến máu",
                    "Bạn có lịch hiến máu lúc " + when + " tại " + orgNames.get(0) + ". Hãy mang giấy tờ tùy thân.",
                    "APPOINTMENT", apptId);
            outbox.enqueuePush(userIds.get(0), OutboxService.PURPOSE_APPT_REMINDER, "APPOINTMENT", apptId, "Nhắc lịch hiến máu",
                    "Lịch lúc " + when + " tại " + orgNames.get(0) + ".", "/donor/appointments", "PUSH:APPT_REMINDER:" + apptId);
            outbox.enqueue(userIds.get(0), OutboxService.Channel.SMS, OutboxService.PURPOSE_APPT_REMINDER, "APPOINTMENT",
                    apptId, outbox.appointmentSms(when, orgNames.get(0), true), "SMS:APPT_REMINDER:" + apptId);
        }
        return due.size();
    }

    // ------------------------------------------------------------------ helpers

    private Organization orgOf(AuthUser user) {
        return organizations.findForUser(user.getId())
                .orElseThrow(() -> AppException.notFound("ORGANIZATION_NOT_FOUND", "Hãy hoàn tất hồ sơ tổ chức trước"));
    }

    private Organization verifiedOrg(AuthUser user) {
        Organization org = orgOf(user);
        if (!org.isVerified()) {
            throw AppException.forbidden("ORGANIZATION_NOT_VERIFIED", "Chỉ cơ sở đã được xác minh mới quản lý lịch hiến máu");
        }
        return org;
    }

    private AppointmentDto mineOne(UUID donorId, UUID appointmentId) {
        return jdbc.query(mineSql("a.donor_id = ? AND a.id = ?", ""), (rs, i) -> appointment(rs), donorId, appointmentId).get(0);
    }

    private static String mineSql(String where, String tail) {
        return """
                SELECT a.id, a.slot_id, s.organization_id, o.name, o.address, s.starts_at, s.ends_at, a.status, a.created_at
                  FROM appointments a JOIN donation_slots s ON s.id = a.slot_id
                  JOIN organizations o ON o.id = s.organization_id
                 WHERE\s""" + where + " " + tail;
    }

    private static String slotSql(String where) {
        return """
                SELECT s.id, s.organization_id, o.name, o.address, o.city, s.starts_at, s.ends_at,
                       s.capacity, s.booked_count, s.status
                  FROM donation_slots s JOIN organizations o ON o.id = s.organization_id
                 WHERE\s""" + where;
    }

    private static SlotDto slot(java.sql.ResultSet rs) throws java.sql.SQLException {
        int capacity = rs.getInt("capacity");
        int booked = rs.getInt("booked_count");
        return new SlotDto(rs.getObject("id", UUID.class), rs.getObject("organization_id", UUID.class),
                rs.getString("name"), rs.getString("address"), rs.getString("city"),
                rs.getTimestamp("starts_at").toInstant(), rs.getTimestamp("ends_at").toInstant(),
                capacity, booked, Math.max(0, capacity - booked), rs.getString("status"));
    }

    private static AppointmentDto appointment(java.sql.ResultSet rs) throws java.sql.SQLException {
        Instant startsAt = rs.getTimestamp("starts_at").toInstant();
        String status = rs.getString("status");
        boolean canCancel = "BOOKED".equals(status) && startsAt.minus(CANCEL_CUTOFF).isAfter(Instant.now());
        return new AppointmentDto(rs.getObject("id", UUID.class), rs.getObject("slot_id", UUID.class),
                rs.getObject("organization_id", UUID.class), rs.getString("name"), rs.getString("address"), startsAt,
                rs.getTimestamp("ends_at").toInstant(), status, canCancel, rs.getTimestamp("created_at").toInstant());
    }

    private static Instant instant(Timestamp t) {
        return t == null ? null : t.toInstant();
    }
}
