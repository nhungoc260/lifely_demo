package com.lifely.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Đặt lại mật khẩu tài khoản quản trị từ biến môi trường ADMIN_PASSWORD khi khởi động,
 * để mật khẩu thật KHÔNG nằm trong source code / lịch sử git.
 * - Không đặt ADMIN_PASSWORD (hoặc để trống) = không làm gì.
 * - Chỉ cập nhật khi mật khẩu hiện tại khác, nên chạy lại nhiều lần vẫn an toàn.
 * - Khi đổi mật khẩu sẽ thu hồi mọi refresh token của admin (đăng xuất các phiên cũ).
 */
@Component
@Order(1)
public class AdminPasswordInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminPasswordInitializer.class);
    private static final int MIN_LENGTH = 12;

    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;
    private final String adminEmail;
    private final String adminPassword;

    public AdminPasswordInitializer(JdbcTemplate jdbc, PasswordEncoder encoder,
                                    @Value("${ADMIN_EMAIL:admin@lifely.demo}") String adminEmail,
                                    @Value("${ADMIN_PASSWORD:}") String adminPassword) {
        this.jdbc = jdbc;
        this.encoder = encoder;
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (adminPassword == null || adminPassword.isBlank()) {
            return;
        }
        if (adminPassword.length() < MIN_LENGTH) {
            log.warn("ADMIN_PASSWORD ngắn hơn {} ký tự, bỏ qua (không đổi mật khẩu admin).", MIN_LENGTH);
            return;
        }
        var rows = jdbc.queryForList("SELECT id, password_hash FROM users WHERE email = ?", adminEmail);
        if (rows.isEmpty()) {
            log.warn("Không tìm thấy tài khoản admin '{}', bỏ qua.", adminEmail);
            return;
        }
        Object id = rows.get(0).get("id");
        String currentHash = (String) rows.get(0).get("password_hash");
        if (currentHash != null && encoder.matches(adminPassword, currentHash)) {
            return; // đã đúng mật khẩu
        }
        jdbc.update("UPDATE users SET password_hash = ? WHERE id = ?", encoder.encode(adminPassword), id);
        int revoked = jdbc.update("UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = ? AND revoked_at IS NULL", id);
        log.info("Đã đặt lại mật khẩu cho tài khoản admin; thu hồi {} phiên đăng nhập cũ.", revoked);
    }
}
