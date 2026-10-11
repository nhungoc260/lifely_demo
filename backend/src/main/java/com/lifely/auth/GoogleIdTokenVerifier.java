package com.lifely.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifely.common.AppException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Set;

/**
 * Xác thực ID token do "Đăng nhập bằng Google" trả về. Chữ ký và thời hạn do Google kiểm tra qua endpoint
 * tokeninfo; backend kiểm tra thêm token được cấp đúng cho ứng dụng này (aud), đúng nơi phát hành (iss)
 * và email đã được Google xác minh. Không cần thêm thư viện nào.
 */
@Component
public class GoogleIdTokenVerifier {

    /** Thông tin lấy từ Google: chỉ có email và tên, Google không biết vai trò của người dùng trong LIFELY. */
    public record GoogleProfile(String email, String name) {
    }

    private static final Logger log = LoggerFactory.getLogger(GoogleIdTokenVerifier.class);
    private static final String TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo?id_token=";
    private static final Set<String> ISSUERS = Set.of("accounts.google.com", "https://accounts.google.com");

    private final String clientId;
    private final ObjectMapper mapper;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    public GoogleIdTokenVerifier(@Value("${lifely.google.client-id:}") String clientId, ObjectMapper mapper) {
        this.clientId = clientId == null ? "" : clientId.trim();
        this.mapper = mapper;
    }

    public boolean isEnabled() {
        return !clientId.isEmpty();
    }

    public GoogleProfile verify(String idToken) {
        if (!isEnabled()) {
            throw new AppException(HttpStatus.SERVICE_UNAVAILABLE, "GOOGLE_NOT_CONFIGURED",
                    "Đăng nhập bằng Google chưa được cấu hình");
        }
        return validateClaims(fetchClaims(idToken));
    }

    private JsonNode fetchClaims(String idToken) {
        try {
            HttpRequest request = HttpRequest.newBuilder(
                            URI.create(TOKENINFO_URL + URLEncoder.encode(idToken, StandardCharsets.UTF_8)))
                    .timeout(Duration.ofSeconds(8))
                    .GET()
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw invalid();
            }
            return mapper.readTree(response.body());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw unavailable();
        } catch (IOException e) {
            log.warn("Không gọi được Google để xác thực token: {}", e.getMessage());
            throw unavailable();
        }
    }

    /** Kiểm tra nội dung token; tách riêng để kiểm thử mà không cần gọi mạng. */
    GoogleProfile validateClaims(JsonNode claims) {
        if (claims == null || !clientId.equals(claims.path("aud").asText())) {
            throw invalid();
        }
        if (!ISSUERS.contains(claims.path("iss").asText())) {
            throw invalid();
        }
        if (claims.path("exp").asLong(0) <= Instant.now().getEpochSecond()) {
            throw invalid();
        }
        if (!"true".equalsIgnoreCase(claims.path("email_verified").asText())) {
            throw AppException.unauthorized("GOOGLE_EMAIL_NOT_VERIFIED", "Email Google này chưa được xác minh");
        }
        String email = claims.path("email").asText("").trim().toLowerCase();
        if (email.isEmpty()) {
            throw invalid();
        }
        return new GoogleProfile(email, claims.path("name").asText("").trim());
    }

    private static AppException invalid() {
        return AppException.unauthorized("INVALID_GOOGLE_TOKEN",
                "Không xác thực được tài khoản Google. Vui lòng thử lại");
    }

    private static AppException unavailable() {
        return new AppException(HttpStatus.SERVICE_UNAVAILABLE, "GOOGLE_UNAVAILABLE",
                "Chưa kết nối được Google. Vui lòng thử lại sau");
    }
}
