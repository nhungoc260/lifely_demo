package com.lifely.mail;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Gửi email qua SMTP (Gmail). Chỉ hoạt động khi MAIL_ENABLED=true; nếu tắt hoặc gửi lỗi thì chỉ ghi log,
 * không bao giờ làm hỏng nghiệp vụ chính (tin nhắn vẫn nằm trong database). Gửi bất đồng bộ.
 * Mật khẩu SMTP (App Password) chỉ đọc từ biến môi trường, không bao giờ ghi vào code hay log.
 */
@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final ObjectProvider<JavaMailSender> senderProvider;
    private final boolean enabled;
    private final String from;
    private final String adminRecipient;

    public MailService(ObjectProvider<JavaMailSender> senderProvider,
                       @Value("${lifely.mail.enabled:false}") boolean enabled,
                       @Value("${lifely.mail.from:}") String from,
                       @Value("${lifely.mail.admin-recipient:}") String adminRecipient) {
        this.senderProvider = senderProvider;
        this.enabled = enabled;
        this.from = from;
        this.adminRecipient = adminRecipient;
    }

    /** Ghi một dòng khi khởi động để biết ngay email đang bật hay tắt (tránh chờ mail mãi mà không biết vì sao). */
    @PostConstruct
    void logStatus() {
        if (isEnabled()) {
            log.info("Email: ĐÃ BẬT, gửi từ {}", mask(from));
        } else {
            log.warn("Email: ĐANG TẮT (MAIL_ENABLED={}, MAIL_USERNAME {}). Email đặt lại mật khẩu sẽ KHÔNG được gửi, "
                            + "link chỉ được in ra log. Xem docs/EMAIL_SETUP.md để bật.",
                    enabled, from.isBlank() ? "chưa điền" : "đã điền");
        }
    }

    public boolean isEnabled() {
        return enabled && !from.isBlank() && senderProvider.getIfAvailable() != null;
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
            SimpleMailMessage m = new SimpleMailMessage();
            m.setFrom(from);
            m.setTo(to);
            m.setSubject(subject);
            m.setText(body);
            senderProvider.getObject().send(m);
        } catch (Exception e) {
            log.warn("Email to {} could not be sent: {}", mask(to), e.getMessage());
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
