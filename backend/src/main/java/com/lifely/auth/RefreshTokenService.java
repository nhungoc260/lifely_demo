package com.lifely.auth;

import com.lifely.common.AppException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

/**
 * Refresh token xoay vòng: mỗi lần dùng sẽ thu hồi token cũ và cấp token mới cùng "family".
 * Nếu một token đã thu hồi bị dùng lại (dấu hiệu bị đánh cắp) thì thu hồi cả family.
 * Hai tab cùng gia hạn một lúc được frontend tuần tự hóa (Web Locks) nên backend không cần khoảng ân hạn.
 */
@Service
public class RefreshTokenService {

    /** Token thô (trả cho trình duyệt qua cookie) và id người dùng sở hữu. */
    public record Rotation(UUID userId, String rawToken) {
    }

    private final RefreshTokenRepository repository;
    private final Duration ttl;
    private final SecureRandom random = new SecureRandom();

    public RefreshTokenService(RefreshTokenRepository repository,
                               @Value("${lifely.auth.refresh-days:14}") long refreshDays) {
        this.repository = repository;
        this.ttl = Duration.ofDays(refreshDays);
    }

    public Duration getTtl() {
        return ttl;
    }

    /** Cấp refresh token đầu tiên của một phiên đăng nhập mới (family mới). */
    @Transactional
    public String issue(UUID userId) {
        return create(userId, UUID.randomUUID());
    }

    /**
     * Đổi refresh token cũ lấy token mới. Ném 401 nếu token không hợp lệ, hết hạn hoặc đã bị thu hồi.
     * noRollbackFor: khi phát hiện dùng lại token, việc thu hồi cả family phải được lưu dù vẫn ném lỗi.
     */
    @Transactional(noRollbackFor = AppException.class)
    public Rotation rotate(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw invalid();
        }
        Instant now = Instant.now();
        RefreshToken current = repository.findByTokenHash(sha256(rawToken)).orElseThrow(RefreshTokenService::invalid);
        if (current.getExpiresAt().isBefore(now)) {
            throw invalid();
        }
        if (current.getRevokedAt() != null) {
            // Token đã dùng/đã bị thu hồi mà vẫn được gửi lại: nghi bị đánh cắp, hủy cả chuỗi phiên.
            repository.revokeFamily(current.getFamilyId(), now);
            throw invalid();
        }
        current.setRevokedAt(now);
        repository.save(current);
        return new Rotation(current.getUserId(), create(current.getUserId(), current.getFamilyId()));
    }

    /** Đăng xuất: thu hồi cả family của token này. Không lỗi nếu token không tồn tại. */
    @Transactional
    public void revoke(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return;
        }
        repository.findByTokenHash(sha256(rawToken))
                .ifPresent(t -> repository.revokeFamily(t.getFamilyId(), Instant.now()));
    }

    /** Dùng khi đổi/đặt lại mật khẩu, khóa hoặc xóa tài khoản: mọi thiết bị phải đăng nhập lại. */
    @Transactional
    public void revokeAll(UUID userId) {
        repository.revokeAllForUser(userId, Instant.now());
    }

    /** Dọn các token đã hết hạn hơn 1 ngày để bảng không phình to. */
    @Scheduled(cron = "0 30 3 * * *")
    @Transactional
    public void purgeExpired() {
        repository.deleteExpiredBefore(Instant.now().minus(Duration.ofDays(1)));
    }

    private String create(UUID userId, UUID familyId) {
        byte[] raw = new byte[48];
        random.nextBytes(raw);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        RefreshToken entity = new RefreshToken();
        entity.setUserId(userId);
        entity.setFamilyId(familyId);
        entity.setTokenHash(sha256(token));
        entity.setExpiresAt(Instant.now().plus(ttl));
        repository.save(entity);
        return token;
    }

    private static AppException invalid() {
        return AppException.unauthorized("INVALID_REFRESH_TOKEN", "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
    }

    private static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
