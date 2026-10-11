package com.lifely.auth;

import com.lifely.audit.AuditAction;
import com.lifely.audit.AuditService;
import com.lifely.auth.dto.*;
import com.lifely.common.AppException;
import com.lifely.donor.DonorProfile;
import com.lifely.donor.DonorProfileRepository;
import com.lifely.mail.MailService;
import com.lifely.user.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final Duration LOCK_DURATION = Duration.ofMinutes(15);
    /** Hash hợp lệ dùng để so sánh giả khi email không tồn tại, tránh lộ email qua thời gian phản hồi. */
    private final String dummyHash;

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PrivacySettingsRepository privacyRepository;
    private final DonorProfileRepository donorProfileRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuditService auditService;
    private final MailService mailService;
    private final RefreshTokenService refreshTokens;
    private final GoogleIdTokenVerifier googleVerifier;
    private final boolean logResetLink;
    private final String frontendUrl;
    private final SecureRandom random = new SecureRandom();

    public AuthService(UserRepository userRepository, RoleRepository roleRepository,
                       PrivacySettingsRepository privacyRepository, DonorProfileRepository donorProfileRepository,
                       PasswordResetTokenRepository resetTokenRepository, PasswordEncoder passwordEncoder,
                       JwtService jwtService, AuditService auditService, MailService mailService,
                       RefreshTokenService refreshTokens, GoogleIdTokenVerifier googleVerifier,
                       @Value("${lifely.auth.log-reset-link:false}") boolean logResetLink,
                       @Value("${lifely.frontend-url:http://localhost:3000}") String frontendUrl) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.privacyRepository = privacyRepository;
        this.donorProfileRepository = donorProfileRepository;
        this.resetTokenRepository = resetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.auditService = auditService;
        this.mailService = mailService;
        this.refreshTokens = refreshTokens;
        this.googleVerifier = googleVerifier;
        this.logResetLink = logResetLink;
        this.frontendUrl = frontendUrl;
        this.dummyHash = passwordEncoder.encode("not-a-real-password");
    }

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (!req.password().equals(req.confirmPassword())) {
            throw AppException.badRequest("PASSWORD_MISMATCH", "Mật khẩu nhập lại không khớp");
        }
        String email = req.email().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw AppException.conflict("EMAIL_TAKEN", "Email này đã được đăng ký");
        }
        User user = createUser(email, req.fullName().trim(), req.phone().trim(),
                passwordEncoder.encode(req.password()), req.role(), "password");
        return buildAuthResponse(user);
    }

    /** Kết quả bước đăng nhập Google: đã có tài khoản thì có auth, chưa có thì cần người dùng bổ sung hồ sơ. */
    public record GoogleOutcome(AuthResponse auth, String email, String fullName) {
    }

    /**
     * Đăng nhập bằng Google. Email đã có tài khoản thì đăng nhập luôn (vai trò giữ nguyên);
     * email mới thì chưa tạo gì, chỉ báo cần chọn vai trò và nhập số điện thoại.
     */
    @Transactional
    public GoogleOutcome googleLogin(String credential) {
        GoogleIdTokenVerifier.GoogleProfile profile = googleVerifier.verify(credential);
        User user = userRepository.findByEmailIgnoreCase(profile.email()).orElse(null);
        if (user == null) {
            return new GoogleOutcome(null, profile.email(), profile.name());
        }
        if (user.getStatus() == UserStatus.SUSPENDED) {
            throw AppException.forbidden("ACCOUNT_SUSPENDED", "Tài khoản này đã bị khóa. Vui lòng liên hệ nhân viên hỗ trợ.");
        }
        return new GoogleOutcome(onLoginSuccess(user), profile.email(), profile.name());
    }

    /** Tạo tài khoản từ Google sau khi người dùng chọn vai trò. Tài khoản không có mật khẩu dùng được (hash ngẫu nhiên). */
    @Transactional
    public AuthResponse googleRegister(GoogleRegisterRequest req) {
        GoogleIdTokenVerifier.GoogleProfile profile = googleVerifier.verify(req.credential());
        if (userRepository.existsByEmailIgnoreCase(profile.email())) {
            throw AppException.conflict("EMAIL_TAKEN", "Email này đã được đăng ký. Hãy đăng nhập bằng Google.");
        }
        String fullName = req.fullName() != null && !req.fullName().isBlank() ? req.fullName().trim() : profile.name();
        if (fullName.length() < 2) {
            throw AppException.badRequest("FULL_NAME_REQUIRED", "Vui lòng nhập họ và tên");
        }
        User user = createUser(profile.email(), fullName, req.phone().trim(),
                passwordEncoder.encode(randomSecret()), req.role(), "google");
        return buildAuthResponse(user);
    }

    private User createUser(String email, String fullName, String phone, String passwordHash,
                            String roleKey, String provider) {
        String roleName = "ROLE_" + roleKey;
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> AppException.badRequest("INVALID_ROLE", "Vai trò không hợp lệ"));

        User user = new User();
        user.setEmail(email);
        user.setFullName(fullName);
        user.setPhone(phone);
        user.setPasswordHash(passwordHash);
        user.setRoles(new HashSet<>(java.util.List.of(role)));
        user = userRepository.save(user);

        privacyRepository.save(new PrivacySettings(user.getId()));
        if (Role.DONOR.equals(roleName)) {
            donorProfileRepository.save(new DonorProfile(user.getId()));
        }
        auditService.log(user.getId(), AuditAction.USER_REGISTERED, "USER", user.getId(),
                Map.of("role", roleKey, "provider", provider));
        return user;
    }

    private String randomSecret() {
        byte[] raw = new byte[32];
        random.nextBytes(raw);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
    }

    /** Không @Transactional ở mức method để bộ đếm đăng nhập sai vẫn được lưu khi ném lỗi. */
    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmailIgnoreCase(req.email().trim()).orElse(null);
        if (user == null) {
            passwordEncoder.matches(req.password(), dummyHash);
            throw AppException.unauthorized("INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng");
        }
        Instant now = Instant.now();
        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(now)) {
            throw new AppException(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS, "ACCOUNT_LOCKED",
                    "Đăng nhập sai quá nhiều lần. Hãy thử lại sau vài phút hoặc đặt lại mật khẩu.");
        }
        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            registerFailure(user, now);
            throw AppException.unauthorized("INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng");
        }
        if (user.getStatus() == UserStatus.SUSPENDED) {
            throw AppException.forbidden("ACCOUNT_SUSPENDED", "Tài khoản này đã bị khóa. Vui lòng liên hệ nhân viên hỗ trợ.");
        }
        return onLoginSuccess(user);
    }

    @Transactional
    protected void registerFailure(User user, Instant now) {
        int attempts = user.getFailedLoginAttempts() + 1;
        user.setFailedLoginAttempts(attempts);
        if (attempts >= MAX_FAILED_ATTEMPTS) {
            user.setLockedUntil(now.plus(LOCK_DURATION));
            user.setFailedLoginAttempts(0);
        }
        userRepository.save(user);
    }

    private AuthResponse onLoginSuccess(User user) {
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);
        auditService.log(user.getId(), AuditAction.LOGIN, "USER", user.getId());
        return buildAuthResponse(user);
    }

    /** Luôn trả cùng một thông báo để không lộ email nào đã đăng ký. */
    @Transactional
    public void forgotPassword(ForgotPasswordRequest req) {
        userRepository.findByEmailIgnoreCase(req.email().trim()).ifPresent(user -> {
            byte[] raw = new byte[32];
            random.nextBytes(raw);
            String token = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
            PasswordResetToken entity = new PasswordResetToken();
            entity.setUserId(user.getId());
            entity.setTokenHash(sha256(token));
            entity.setExpiresAt(Instant.now().plus(Duration.ofMinutes(30)));
            resetTokenRepository.save(entity);
            String link = frontendUrl + "/reset-password?token=" + token;
            if (mailService.isEnabled()) {
                mailService.send(user.getEmail(), "Đặt lại mật khẩu LIFELY",
                        "Xin chào " + user.getFullName() + ",\n\nBấm vào liên kết sau để đặt lại mật khẩu (có hiệu lực 30 phút):\n"
                                + link + "\n\nNếu bạn không yêu cầu, hãy bỏ qua email này.");
            } else if (logResetLink) {
                // Chưa cấu hình email: ở môi trường dev, link đặt lại được ghi vào log máy chủ.
                log.info("[DEV ONLY] Password reset link for {}: {}", user.getEmail(), link);
            }
        });
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest req) {
        PasswordResetToken token = resetTokenRepository.findByTokenHash(sha256(req.token()))
                .filter(t -> t.getUsedAt() == null && t.getExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> AppException.badRequest("INVALID_RESET_TOKEN",
                        "Liên kết đặt lại không hợp lệ hoặc đã hết hạn"));
        User user = userRepository.findById(token.getUserId())
                .orElseThrow(() -> AppException.badRequest("INVALID_RESET_TOKEN", "Liên kết đặt lại không hợp lệ hoặc đã hết hạn"));
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        token.setUsedAt(Instant.now());
        userRepository.save(user);
        resetTokenRepository.save(token);
        refreshTokens.revokeAll(user.getId());   // đổi mật khẩu thì mọi thiết bị phải đăng nhập lại
        auditService.log(user.getId(), AuditAction.PASSWORD_RESET, "USER", user.getId());
        if (mailService.isEnabled()) {
            mailService.send(user.getEmail(), "Mật khẩu LIFELY đã được đổi",
                    "Xin chào " + user.getFullName() + ",\n\nMật khẩu tài khoản LIFELY của bạn vừa được đổi thành công. "
                            + "Mọi thiết bị đã được đăng xuất, bạn hãy đăng nhập lại bằng mật khẩu mới.\n\n"
                            + "Nếu không phải bạn thực hiện, hãy bấm \"Quên mật khẩu\" để đặt lại ngay và liên hệ hỗ trợ.");
        }
    }

    /** Kết quả gia hạn phiên: access token mới cùng refresh token mới (để controller ghi vào cookie). */
    public record RefreshedSession(AuthResponse auth, String refreshToken) {
    }

    /** Cấp refresh token cho phiên đăng nhập vừa tạo (login/register). */
    public String startSession(UUID userId) {
        return refreshTokens.issue(userId);
    }

    public Duration refreshTtl() {
        return refreshTokens.getTtl();
    }

    /** Đổi refresh token lấy access token mới. Tài khoản bị khóa thì thu hồi toàn bộ phiên. */
    @Transactional(noRollbackFor = AppException.class)
    public RefreshedSession refresh(String rawRefreshToken) {
        RefreshTokenService.Rotation rotation = refreshTokens.rotate(rawRefreshToken);
        User user = userRepository.findById(rotation.userId())
                .orElseThrow(() -> AppException.unauthorized("INVALID_REFRESH_TOKEN",
                        "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại"));
        if (user.getStatus() != UserStatus.ACTIVE) {
            refreshTokens.revokeAll(user.getId());
            throw AppException.unauthorized("INVALID_REFRESH_TOKEN",
                    "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
        }
        return new RefreshedSession(buildAuthResponse(user), rotation.rawToken());
    }

    public void logout(String rawRefreshToken) {
        refreshTokens.revoke(rawRefreshToken);
    }

    private AuthResponse buildAuthResponse(User user) {
        return new AuthResponse(jwtService.generate(user), jwtService.getTtl().toSeconds(), UserSummary.from(user));
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
