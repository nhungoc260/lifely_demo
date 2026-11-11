package com.lifely.matching;

import com.lifely.abuse.AbuseGuardService;
import com.lifely.abuse.AbuseRules;
import com.lifely.audit.AuditService;
import com.lifely.auth.AuthUser;
import com.lifely.common.AppException;
import com.lifely.notification.NotificationService;
import com.lifely.notification.NotificationType;
import com.lifely.organization.Organization;
import com.lifely.organization.OrganizationRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Ghi nhận cơ sở y tế đã chi hỗ trợ đi lại (tiền mặt, ngoài LIFELY) cho người hiến theo YÊU CẦU MÁU KHẨN CẤP.
 * Chỉ nhân viên của đúng cơ sở gắn với yêu cầu, chỉ khi lượt hiến đã được cơ sở xác nhận, một lần cho mỗi lượt.
 * Yêu cầu của gia đình (không gắn cơ sở) không có khoản này vì không có bên nào chịu trách nhiệm chi và đối soát.
 */
@Service
public class MatchSupportService {

    public record Result(UUID matchId, int amountVnd) {
    }

    private record Info(String status, Integer paidVnd, UUID organizationId, String hospitalName, UUID donorId,
                        UUID donorUserId, String verificationLevel) {
    }

    private final JdbcTemplate jdbc;
    private final OrganizationRepository organizations;
    private final AbuseGuardService abuseGuard;
    private final NotificationService notifications;
    private final AuditService audit;

    public MatchSupportService(JdbcTemplate jdbc, OrganizationRepository organizations, AbuseGuardService abuseGuard,
                               NotificationService notifications, AuditService audit) {
        this.jdbc = jdbc;
        this.organizations = organizations;
        this.abuseGuard = abuseGuard;
        this.notifications = notifications;
        this.audit = audit;
    }

    @Transactional
    public Result pay(AuthUser user, UUID matchId, Integer amountVnd) {
        Organization org = organizations.findForUser(user.getId())
                .orElseThrow(() -> AppException.forbidden("NOT_ORG_STAFF", "Chỉ nhân viên cơ sở y tế mới ghi nhận được hỗ trợ đi lại"));
        if (!org.isVerified()) {
            throw AppException.forbidden("ORGANIZATION_NOT_VERIFIED", "Chỉ cơ sở đã được xác minh mới ghi nhận được hỗ trợ đi lại");
        }
        List<Info> found = jdbc.query("""
                SELECT m.status, m.travel_support_paid_vnd, r.organization_id, r.hospital_name, m.donor_id, dp.user_id,
                       (SELECT h.verification_level FROM donation_history h WHERE h.match_id = m.id LIMIT 1) AS vlevel
                  FROM matches m JOIN blood_requests r ON r.id = m.request_id JOIN donor_profiles dp ON dp.id = m.donor_id
                 WHERE m.id = ?
                """, (rs, i) -> new Info(rs.getString("status"), rs.getObject("travel_support_paid_vnd", Integer.class),
                rs.getObject("organization_id", UUID.class), rs.getString("hospital_name"), rs.getObject("donor_id", UUID.class),
                rs.getObject("user_id", UUID.class), rs.getString("vlevel")), matchId);
        // Trả 404 cho cơ sở khác để không lộ sự tồn tại của lượt kết nối.
        if (found.isEmpty() || !org.getId().equals(found.get(0).organizationId())) {
            throw AppException.notFound("MATCH_NOT_FOUND", "Không tìm thấy lượt kết nối");
        }
        Info info = found.get(0);
        if (!"COMPLETED".equals(info.status())) {
            throw AppException.conflict("MATCH_NOT_COMPLETED", "Chỉ ghi nhận hỗ trợ cho lượt đã hiến");
        }
        if (!"ORG_VERIFIED".equals(info.verificationLevel())) {
            throw AppException.conflict("MATCH_NOT_FACILITY_VERIFIED", "Cần cơ sở xác nhận lượt hiến trước khi ghi nhận hỗ trợ đi lại");
        }
        if (info.paidVnd() != null) {
            throw AppException.conflict("TRAVEL_SUPPORT_ALREADY_PAID", "Lượt hiến này đã được ghi nhận hỗ trợ đi lại");
        }
        int amount = amountVnd != null ? amountVnd : org.getTravelSupportVnd();
        if (amount <= 0) {
            throw AppException.badRequest("TRAVEL_SUPPORT_AMOUNT", "Cơ sở chưa công bố mức hỗ trợ đi lại; hãy nhập số tiền đã chi");
        }

        String blocked = abuseGuard.supportBlockReason("MATCH", matchId);
        if (blocked != null) {
            throw AppException.conflict("TRAVEL_SUPPORT_BLOCKED",
                    "Không ghi nhận hỗ trợ đi lại vì lượt hiến này đang bị đánh dấu bất thường: " + blocked);
        }
        // Người hiến đã có lần hiến khác (khẩn cấp hoặc lịch hẹn) trong 12 tuần gần đây: dấu hiệu lấy tiền, quà nhiều lần.
        Integer sinceDays = jdbc.queryForObject("""
                SELECT (current_date - MAX(d))::int FROM (
                    SELECT h.donated_on AS d FROM donation_history h
                     WHERE h.donor_id = ? AND (h.match_id IS NULL OR h.match_id <> ?)
                    UNION ALL
                    SELECT a.handled_at::date FROM appointments a WHERE a.donor_id = ? AND a.status = 'DONATED'
                ) x
                """, Integer.class, info.donorId(), matchId, info.donorId());
        AbuseRules.Finding tooSoon = sinceDays == null ? null : AbuseRules.donationTooSoon(sinceDays);
        if (tooSoon != null) {
            abuseGuard.recordFlag("MATCH", matchId, tooSoon, "SUPPORT_BLOCKED");
            throw AppException.conflict("TRAVEL_SUPPORT_BLOCKED",
                    "Không ghi nhận hỗ trợ đi lại: " + tooSoon.detail() + ". Admin sẽ xem xét.");
        }
        AbuseRules.Finding over = AbuseRules.supportOverLimit(amount);
        if (over != null) {
            abuseGuard.recordFlag("MATCH", matchId, over, "NONE");
        }
        Long burst = jdbc.queryForObject("""
                SELECT COUNT(*) FROM matches m JOIN blood_requests r ON r.id = m.request_id
                 WHERE r.organization_id = ? AND m.travel_support_paid_at > now() - interval '1 hour'
                """, Long.class, org.getId());
        AbuseRules.Finding spike = AbuseRules.orgBurst(burst == null ? 0 : burst);
        if (spike != null) {
            abuseGuard.recordFlag("ORGANIZATION", org.getId(), spike, "NONE");
        }

        int n = jdbc.update("""
                UPDATE matches SET travel_support_paid_vnd = ?, travel_support_paid_at = now()
                 WHERE id = ? AND status = 'COMPLETED' AND travel_support_paid_vnd IS NULL
                """, amount, matchId);
        if (n == 0) {
            throw AppException.conflict("TRAVEL_SUPPORT_ALREADY_PAID", "Lượt hiến này đã được ghi nhận hỗ trợ đi lại");
        }
        audit.log(user.getId(), "MATCH_TRAVEL_SUPPORT_PAID", "MATCH", matchId, Map.of("amountVnd", amount));
        notifications.notify(info.donorUserId(), NotificationType.SYSTEM, "Đã ghi nhận hỗ trợ đi lại",
                org.getName() + " ghi nhận đã hỗ trợ tiền đi lại " + String.format("%,d", amount).replace(',', '.')
                        + "đ cho lần hiến máu của bạn tại " + info.hospitalName() + ".", "MATCH", matchId);
        return new Result(matchId, amount);
    }
}
