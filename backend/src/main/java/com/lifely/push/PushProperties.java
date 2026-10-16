package com.lifely.push;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

/**
 * Web Push (miễn phí, VAPID). Khóa lấy từ biến môi trường, KHÔNG ghi vào source. Sinh khóa: tools/push/generate-vapid-keys.sh.
 * Kênh chỉ chạy khi lifely.notify.push-enabled=true VÀ có đủ cặp khóa.
 */
@ConfigurationProperties(prefix = "lifely.push")
@Getter
@Setter
public class PushProperties {

    /** Khóa công khai VAPID (base64url, 65 byte). Được gửi cho trình duyệt để đăng ký. */
    private String publicKey = "";
    /** Khóa riêng VAPID (base64url, 32 byte). BÍ MẬT. */
    private String privateKey = "";
    /** Địa chỉ liên hệ của bên gửi, ví dụ mailto:ban@example.com (bắt buộc theo RFC 8292). */
    private String subject = "";
    private int ttlSeconds = 86400;
    /**
     * Chống SSRF: server chỉ gửi tới các dịch vụ push đã biết. Endpoint do trình duyệt cung cấp phải là https và host
     * kết thúc bằng một trong các hậu tố này.
     */
    private List<String> allowedHostSuffixes = new ArrayList<>(List.of(
            "fcm.googleapis.com", "push.services.mozilla.com", "push.apple.com", "notify.windows.com", "android.googleapis.com"));
    /** Chỉ dùng cho kiểm thử cục bộ: cho phép endpoint http://localhost. KHÔNG bật khi triển khai. */
    private boolean allowInsecureLocalhost = false;

    public boolean hasKeys() {
        return !publicKey.isBlank() && !privateKey.isBlank() && !subject.isBlank();
    }
}
