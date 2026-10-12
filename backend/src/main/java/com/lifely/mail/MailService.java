package com.lifely.mail;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Gửi email theo 1 trong 3 cách, tự chọn theo cấu hình (ưu tiên từ trên xuống):
 *  1. Có MAIL_APPS_SCRIPT_URL: gửi qua Google Apps Script bằng chính Gmail của bạn (HTTPS, không cần số điện thoại/tên miền).
 *  2. Có BREVO_API_KEY: gửi qua API HTTPS của Brevo.
 *  3. Còn lại: Gmail SMTP (MAIL_USERNAME + MAIL_PASSWORD), dùng khi chạy trên máy cá nhân.
 * Cách 1 và 2 dùng cổng 443 nên chạy được trên Render gói miễn phí (Render chặn cổng SMTP).
 * Chỉ hoạt động khi MAIL_ENABLED=true; nếu tắt hoặc gửi lỗi thì chỉ ghi log, không làm hỏng nghiệp vụ chính.
 * Gửi bất đồng bộ. Khóa/mật khẩu chỉ đọc từ biến môi trường, không ghi vào log.
 */
@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);
    private static final URI BREVO_URL = URI.create("https://api.brevo.com/v3/smtp/email");

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .followRedirects(HttpClient.Redirect.NORMAL) // Apps Script trả 302 sang script.googleusercontent.com
            .build();
    private final ObjectMapper json = new ObjectMapper();
    private final ObjectProvider<JavaMailSender> senderProvider;
    private final boolean enabled;
    private final String appsScriptUrl;
    private final String appsScriptSecret;
    private final String brevoApiKey;
    private final String smtpUsername;
    private final String smtpPassword;
    private final String from;
    private final String fromName;
    private final String adminRecipient;

    public MailService(ObjectProvider<JavaMailSender> senderProvider,
                       @Value("${lifely.mail.enabled:false}") boolean enabled,
                       @Value("${lifely.mail.apps-script-url:}") String appsScriptUrl,
                       @Value("${lifely.mail.apps-script-secret:}") String appsScriptSecret,
                       @Value("${lifely.mail.brevo-api-key:}") String brevoApiKey,
                       @Value("${spring.mail.username:}") String smtpUsername,
                       @Value("${spring.mail.password:}") String smtpPassword,
                       @Value("${lifely.mail.from:}") String from,
                       @Value("${lifely.mail.from-name:LIFELY}") String fromName,
                       @Value("${lifely.mail.admin-recipient:}") String adminRecipient) {
        this.senderProvider = senderProvider;
        this.enabled = enabled;
        this.appsScriptUrl = appsScriptUrl == null ? "" : appsScriptUrl.trim();
        this.appsScriptSecret = appsScriptSecret == null ? "" : appsScriptSecret.trim();
        this.brevoApiKey = brevoApiKey == null ? "" : brevoApiKey.trim();
        this.smtpUsername = smtpUsername == null ? "" : smtpUsername.trim();
        // App Password Google hiển thị có dấu cách; bỏ hết dấu cách để tránh lỗi đăng nhập.
        this.smtpPassword = smtpPassword == null ? "" : smtpPassword.replaceAll("\\s", "");
        this.from = from == null ? "" : from.trim();
        this.fromName = fromName;
        this.adminRecipient = adminRecipient;
    }

    private boolean useAppsScript() {
        return !appsScriptUrl.isBlank() && !appsScriptSecret.isBlank();
    }

    private boolean useBrevo() {
        return !brevoApiKey.isBlank() && !from.isBlank();
    }

    private boolean useSmtp() {
        return !smtpUsername.isBlank() && !smtpPassword.isBlank() && !from.isBlank();
    }

    private String mode() {
        if (useAppsScript()) {
            return "Gmail qua Apps Script";
        }
        if (useBrevo()) {
            return "Brevo API";
        }
        return "Gmail SMTP";
    }

    /** Ghi một dòng khi khởi động để biết ngay email đang bật hay tắt. */
    @PostConstruct
    void logStatus() {
        if (isEnabled()) {
            log.info("Email: ĐÃ BẬT ({})", mode());
        } else {
            log.warn("Email: ĐANG TẮT (MAIL_ENABLED={}, Apps Script {}, Brevo {}, Gmail SMTP {}). "
                            + "Email đặt lại mật khẩu sẽ KHÔNG được gửi. Xem docs/EMAIL_SETUP.md để bật.",
                    enabled, useAppsScript() ? "đã cấu hình" : "chưa", useBrevo() ? "đã cấu hình" : "chưa",
                    useSmtp() ? "đã cấu hình" : "chưa");
        }
    }

    public boolean isEnabled() {
        return enabled && (useAppsScript() || useBrevo() || useSmtp());
    }

    public boolean hasAdminRecipient() {
        return !adminRecipient.isBlank();
    }

    @Async
    public void send(String to, String subject, String body) {
        if (!isEnabled() || to == null || to.isBlank()) {
            return;
        }
        try {
            if (useAppsScript()) {
                sendViaAppsScript(to.trim(), subject, body);
            } else if (useBrevo()) {
                sendViaBrevo(to.trim(), subject, body);
            } else {
                sendViaSmtp(to.trim(), subject, body);
            }
            log.info("Email: đã gửi '{}' tới {}", subject, mask(to));
        } catch (Exception e) {
            Throwable root = e;
            while (root.getCause() != null) {
                root = root.getCause();
            }
            log.error("Email to {} could not be sent: {} | nguyên nhân gốc: {}", mask(to), e.getMessage(), root.getMessage());
        }
    }

    private void sendViaSmtp(String to, String subject, String body) {
        SimpleMailMessage m = new SimpleMailMessage();
        m.setFrom(from);
        m.setTo(to);
        m.setSubject(subject);
        m.setText(body);
        senderProvider.getObject().send(m);
    }

    private void sendViaBrevo(String to, String subject, String body) throws Exception {
        String payload = json.writeValueAsString(Map.of(
                "sender", Map.of("name", fromName, "email", from),
                "to", List.of(Map.of("email", to)),
                "subject", subject,
                "textContent", body));
        HttpRequest req = HttpRequest.newBuilder(BREVO_URL)
                .timeout(Duration.ofSeconds(10))
                .header("api-key", brevoApiKey)
                .header("accept", "application/json")
                .header("content-type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(payload))
                .build();
        HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() / 100 != 2) {
            throw new IllegalStateException("Brevo trả về HTTP " + res.statusCode() + " " + res.body());
        }
    }

    private void sendViaAppsScript(String to, String subject, String body) throws Exception {
        String payload = json.writeValueAsString(Map.of(
                "secret", appsScriptSecret,
                "to", to,
                "subject", subject,
                "body", body,
                "fromName", fromName));
        HttpRequest req = HttpRequest.newBuilder(URI.create(appsScriptUrl))
                .timeout(Duration.ofSeconds(20))
                .header("content-type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(payload))
                .build();
        HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
        String resBody = res.body() == null ? "" : res.body();
        if (res.statusCode() / 100 != 2 || !resBody.contains("\"ok\":true")) {
            String snippet = resBody.length() > 200 ? resBody.substring(0, 200) : resBody;
            throw new IllegalStateException("Apps Script trả về HTTP " + res.statusCode() + " " + snippet);
        }
    }

    public void sendToAdmin(String subject, String body) {
        if (hasAdminRecipient()) {
            send(adminRecipient, subject, body);
        }
    }

    private static String mask(String email) {
        int at = email.indexOf('@');
        return at <= 1 ? "***" : email.charAt(0) + "***" + email.substring(at);
    }
}
