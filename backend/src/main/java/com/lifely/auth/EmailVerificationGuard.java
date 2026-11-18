package com.lifely.auth;

import com.lifely.common.AppException;
import com.lifely.user.User;
import com.lifely.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Chặn các hành động có thể bị lạm dụng (tạo yêu cầu, nhận lời hiến) với tài khoản chưa xác minh email.
 * Bật bằng lifely.auth.require-verified-email (biến môi trường REQUIRE_VERIFIED_EMAIL). Mặc định tắt để bản demo
 * chưa cấu hình gửi email vẫn dùng được; khi chạy thật hãy bật cùng MAIL_ENABLED=true.
 */
@Component
public class EmailVerificationGuard {

    private final boolean required;
    private final UserRepository userRepository;

    public EmailVerificationGuard(@Value("${lifely.auth.require-verified-email:false}") boolean required,
                                  UserRepository userRepository) {
        this.required = required;
        this.userRepository = userRepository;
    }

    public void requireVerified(UUID userId) {
        if (!required) {
            return;
        }
        boolean verified = userRepository.findById(userId).map(User::isEmailVerified).orElse(false);
        if (!verified) {
            throw AppException.forbidden("EMAIL_NOT_VERIFIED",
                    "Hãy xác minh email trước khi dùng chức năng này. Kiểm tra hộp thư để lấy liên kết xác minh.");
        }
    }
}
