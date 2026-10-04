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
        sb.append("LIFELY - Bao cao tong hop ").append(LocalDate.now()).append("\n\n");
        sb.append("TONG QUAN\n");
        sb.append("- Nguoi dung: ").append(k.get("users")).append(" (donor: ").append(k.get("donors")).append(")\n");
        sb.append("- Yeu cau dang hoat dong: ").append(k.get("activeRequests"))
                .append(" (khan cap: ").append(k.get("criticalRequests")).append(")\n");
        sb.append("- Match da xac nhan: ").append(k.get("confirmedMatches"))
                .append(" | da hoan tat hien mau: ").append(k.get("completedMatches")).append("\n");
        sb.append("- To chuc da xac minh: ").append(k.get("verifiedOrganizations")).append("\n\n");
        sb.append("CAN XU LY\n");
        sb.append("- Yeu cau cho xac minh: ").append(k.get("pendingVerification")).append("\n");
        sb.append("- To chuc dang cho duyet: ").append(k.get("organizationsUnderReview")).append("\n");
        sb.append("- Bao cao vi pham dang mo: ").append(k.get("openReports")).append("\n");
        sb.append("- Tin nhan lien he moi: ").append(k.get("newMessages")).append("\n\n");
        sb.append("TRANG THAI YEU CAU\n");
        status.forEach(s -> sb.append("- ").append(s.get("status")).append(": ").append(s.get("total")).append("\n"));
        sb.append("\nTHOI GIAN PHAN HOI TRUNG BINH (phut, tu luc lien he den luc tra loi)\n");
        if (response.isEmpty()) {
            sb.append("- Chua co du lieu\n");
        }
        response.forEach(r -> sb.append("- ").append(r.get("urgency")).append(": ").append(r.get("avgMinutes"))
                .append(" (").append(r.get("responses")).append(" phan hoi)\n"));
        sb.append("\nLIFELY la nen tang dieu phoi, khong thay the quyet dinh y te.\n");
        return sb.toString();
    }

    /** Trả về true nếu đã đưa email vào hàng đợi gửi. */
    public boolean sendNow() {
        if (!mail.isEnabled() || !mail.hasAdminRecipient()) {
            return false;
        }
        mail.sendToAdmin("[LIFELY] Bao cao tong hop " + LocalDate.now(), build());
        return true;
    }

    @Scheduled(cron = "${lifely.mail.weekly-report-cron:0 0 8 * * MON}", zone = "Asia/Ho_Chi_Minh")
    public void weekly() {
        if (sendNow()) {
            log.info("Weekly summary report queued for the admin mailbox");
        }
    }
}
