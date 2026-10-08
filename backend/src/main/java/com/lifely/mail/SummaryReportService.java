package com.lifely.mail;

import com.lifely.admin.AdminStatsService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** Báo cáo thống kê gửi cho admin: tự động mỗi tuần và theo yêu cầu (nút trên dashboard). */
@Service
public class SummaryReportService {

    private static final Logger log = LoggerFactory.getLogger(SummaryReportService.class);

    private final AdminStatsService stats;
    private final MailService mail;

    public SummaryReportService(AdminStatsService stats, MailService mail) {
        this.stats = stats;
        this.mail = mail;
    }

    @SuppressWarnings("unchecked")
    public String build() {
        Map<String, Object> d = stats.dashboard();
        Map<String, Object> k = (Map<String, Object>) d.get("kpi");
        List<Map<String, Object>> status = (List<Map<String, Object>>) d.get("requestStatus");
        List<Map<String, Object>> response = (List<Map<String, Object>>) d.get("emergencyResponse");
        StringBuilder sb = new StringBuilder();
        sb.append("LIFELY - Báo cáo tổng hợp ").append(LocalDate.now()).append("\n\n");
        sb.append("TỔNG QUAN\n");
        sb.append("- Người dùng: ").append(k.get("users")).append(" (người hiến máu: ").append(k.get("donors")).append(")\n");
        sb.append("- Yêu cầu đang hoạt động: ").append(k.get("activeRequests"))
                .append(" (nguy kịch: ").append(k.get("criticalRequests")).append(")\n");
        sb.append("- Lượt kết nối đã xác nhận: ").append(k.get("confirmedMatches"))
                .append(" | đã hoàn tất hiến máu: ").append(k.get("completedMatches")).append("\n");
        sb.append("- Tổ chức đã xác minh: ").append(k.get("verifiedOrganizations")).append("\n\n");
        sb.append("CẦN XỬ LÝ\n");
        sb.append("- Yêu cầu chờ xác minh: ").append(k.get("pendingVerification")).append("\n");
        sb.append("- Tổ chức đang chờ duyệt: ").append(k.get("organizationsUnderReview")).append("\n");
        sb.append("- Báo cáo vi phạm đang mở: ").append(k.get("openReports")).append("\n");
        sb.append("- Tin nhắn liên hệ mới: ").append(k.get("newMessages")).append("\n\n");
        sb.append("TRẠNG THÁI YÊU CẦU\n");
        status.forEach(s -> sb.append("- ").append(statusLabel(String.valueOf(s.get("status")))).append(": ").append(s.get("total")).append("\n"));
        sb.append("\nTHỜI GIAN PHẢN HỒI TRUNG BÌNH (phút, từ lúc liên hệ đến lúc trả lời)\n");
        if (response.isEmpty()) {
            sb.append("- Chưa có dữ liệu\n");
        }
        response.forEach(r -> sb.append("- ").append(urgencyLabel(String.valueOf(r.get("urgency")))).append(": ").append(r.get("avgMinutes"))
                .append(" (").append(r.get("responses")).append(" phản hồi)\n"));
        sb.append("\nLIFELY là nền tảng điều phối, không thay thế quyết định y tế.\n");
        return sb.toString();
    }

    private static String statusLabel(String s) {
        return switch (s) {
            case "CREATED" -> "Đã tạo";
            case "PENDING_VERIFICATION" -> "Chờ xác minh";
            case "VERIFIED" -> "Đã xác minh";
            case "MATCHING" -> "Đang tìm người hiến";
            case "DONORS_CONTACTED" -> "Đã liên hệ người hiến";
            case "PARTIALLY_FULFILLED" -> "Đã có một phần";
            case "FULFILLED" -> "Đã đủ người";
            case "CANCELLED" -> "Đã hủy";
            case "EXPIRED" -> "Đã hết hạn";
            default -> s;
        };
    }

    private static String urgencyLabel(String s) {
        return switch (s) {
            case "CRITICAL" -> "Nguy kịch";
            case "URGENT" -> "Khẩn";
            case "NORMAL" -> "Bình thường";
            default -> s;
        };
    }

    /** Trả về true nếu đã đưa email vào hàng đợi gửi. */
    public boolean sendNow() {
        if (!mail.isEnabled() || !mail.hasAdminRecipient()) {
            return false;
        }
        mail.sendToAdmin("[LIFELY] Báo cáo tổng hợp " + LocalDate.now(), build());
        return true;
    }

    @Scheduled(cron = "${lifely.mail.weekly-report-cron:0 0 8 * * MON}", zone = "Asia/Ho_Chi_Minh")
    public void weekly() {
        if (sendNow()) {
            log.info("Weekly summary report queued for the admin mailbox");
        }
    }
}
