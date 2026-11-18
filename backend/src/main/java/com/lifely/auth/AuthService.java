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
    /** Ngưỡng khóa cả tài khoản cao và ngắn: chỉ để chặn dò mật khẩu quy mô lớn, không để khóa người khác dễ dàng. */
    private static final int MAX_FAILED_ATTEMPTS = 20;
    private static final Duration LOCK_DURATION = Duration.ofMinutes(5);
    /** Khóa theo (email + IP), 5 lần sai / 15 phút: kẻ tấn công chỉ khóa được IP của chính mình. */
    private final LoginThrottle throttle = new LoginThrottle();
    /** Hash hợp lệ dùng để so sánh giả khi email không tồn tại, tránh lộ email qua thời gian phản hồi. */
    private final String dummyHash;

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PrivacySettingsRepository privacyRepository;
    private final DonorProfileRepository donorProfileRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final EmailVerificationTokenRepository verificationTokenRepository;
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
                       PasswordResetTokenRepository resetTokenRepository,
                       EmailVerificationTokenRepository verificationTokenRepository, PasswordEncoder passwordEncoder,
                       JwtService jwtService, AuditService auditService, MailService mailService,
                       RefreshTokenService refreshTokens, GoogleIdTokenVerifier googleVerifier,
                       @Value("${lifely.auth.log-reset-link:false}") boolean logResetLink,
                       @Value("${lifely.frontend-url:http://localhost:3000}") String frontendUrl) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.privacyRepository = privacyRepository;
        this.donorProfileRepository = donorProfileRepository;
        this.resetTokenRepository = resetTokenRepository;
        this.verificationTokenRepository = verificationTokenRepository;
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
                passwordEncoder.encode(req.password()), req.role(), "password", false);
        sendVerificationEmail(user);
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
        if (!user.isEmailVerified()) {
            claimUnverifiedAccount(user);
        }
        return new GoogleOutcome(onLoginSuccess(user), profile.email(), profile.name());
    }

    /**
     * Chống chiếm tài khoản: tài khoản này được tạo bằng mật khẩu nhưng CHƯA từng xác minh email. Người vừa đăng nhập
     * Google đã chứng minh họ sở hữu email đó, còn người đặt mật khẩu lúc đăng ký thì chưa chắc. Vì vậy vô hiệu mật khẩu cũ
     * và mọi phiên đang có, rồi đánh dấu đã xác minh. Người dùng thật đặt lại mật khẩu bằng "Quên mật khẩu" nếu cần.
     */
    private void claimUnverifiedAccount(User user) {
        user.setPasswordHash(passwordEncoder.encode(randomSecret()));
        user.setEmailVerified(true);
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);
        refreshTokens.revokeAll(user.getId());
        resetTokenRepository.deleteByUserId(user.getId());
        verificationTokenRepository.deleteByUserId(user.getId());
        auditService.log(user.getId(), "ACCOUNT_CLAIMED_VIA_GOOGLE", "USER", user.getId(),
                Map.of("reason", "unverified_password_account"));
    }

    /** Gửi email xác minh (hiệu lực 24 giờ). Lỗi gửi mail không làm hỏng đăng ký. */
    private void sendVerificationEmail(User user) {
        verificationTokenRepository.deleteByUserId(user.getId());   // chỉ giữ link mới nhất
        byte[] raw = new byte[32];
        random.nextBytes(raw);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        EmailVerificationToken entity = new EmailVerificationToken();
        entity.setUserId(user.getId());
        entity.setTokenHash(sha256(token));
        entity.setExpiresAt(Instant.now().plus(Duration.ofHours(24)));
        verificationTokenRepository.save(entity);
        String link = frontendUrl + "/verify-email?token=" + token;
        try {
            if (mailService.isEnabled()) {
                mailService.send(user.getEmail(), "Xác minh email LIFELY",
                        "Xin chào " + user.getFullName() + ",\n\nBấm vào liên kết sau để xác minh email (có hiệu lực 24 giờ):\n"
                                + link + "\n\nNếu bạn không đăng ký LIFELY, hãy bỏ qua email này.");
            } else if (logResetLink) {
                log.info("[DEV ONLY] Email verification link for {}: {}", user.getEmail(), link);
            }
        } catch (RuntimeException e) {
            log.warn("Không gửi được email xác minh cho người dùng {}", user.getId(), e);
        }
    }

    @Transactional
    public void verifyEmail(String rawToken) {
        EmailVerificationToken token = verificationTokenRepository.findByTokenHash(sha256(rawToken))
                .filter(t -> t.getUsedAt() == null && t.getExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> AppException.badRequest("INVALID_VERIFICATION_TOKEN",
                        "Liên kết xác minh không hợp lệ hoặc đã hết hạn"));
        User user = userRepository.findById(token.getUserId())
                .orElseThrow(() -> AppException.badRequest("INVALID_VERIFICATION_TOKEN",
                        "Liên kết xác minh không hợp lệ hoặc đã hết hạn"));
        user.setEmailVerified(true);
        token.setUsedAt(Instant.now());
        userRepository.save(user);
        verificationTokenRepository.save(token);
        auditService.log(user.getId(), "EMAIL_VERIFIED", "USER", user.getId(), Map.of());
    }

    /** Luôn trả cùng một kết quả để không lộ email nào đã đăng ký. */
    @Transactional
    public void resendVerification(String email) {
        userRepository.findByEmailIgnoreCase(email.trim())
                .filter(u -> !u.isEmailVerified())
                .ifPresent(this::sendVerificationEmail);
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
                passwordEncoder.encode(randomSecret()), req.role(), "google", true);   // Google đã xác minh email
        return buildAuthResponse(user);
    }

    private User createUser(String email, String fullName, String phone, String passwordHash,
                            String roleKey, String provider, boolean emailVerified) {
        String roleName = "ROLE_" + roleKey;
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> AppException.badRequest("INVALID_ROLE", "Vai trò không hợp lệ"));

        User user = new User();
        user.setEmail(email);
        user.setFullName(fullName);
        user.setPhone(phone);
        user.setPasswordHash(passwordHash);
        user.setEmailVerified(emailVerified);
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
        return login(req, "unknown");
    }

    public AuthResponse login(LoginRequest req, String clientIp) {
        String email = req.email().trim();
        String throttleKey = email.toLowerCase(java.util.Locale.ROOT) + "|" + clientIp;
        Instant now = Instant.now();
        if (throttle.isLocked(throttleKey, now)) {
            throw new AppException(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS, "LOGIN_THROTTLED",
                    "Bạn đã nhập sai quá nhiều lần từ thiết bị này. Hãy thử lại sau 15 phút hoặc đặt lại mật khẩu.");
        }
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user == null) {
            passwordEncoder.matches(req.password(), dummyHash);
            throttle.recordFailure(throttleKey, now);
            throw AppException.unauthorized("INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng");
        }
        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(now)) {
            throw new AppException(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS, "ACCOUNT_LOCKED",
                    "Đăng nhập sai quá nhiều lần. Hãy thử lại sau vài phút hoặc đặt lại mật khẩu.");
        }
        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throttle.recordFailure(throttleKey, now);
            registerFailure(user, now);
            throw AppException.unauthorized("INVALID_CREDENTIALS", "Email hoặc mật khẩu không đúng");
        }
        throttle.clear(throttleKey);
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
        user.setEmailVerified(true);   // link đặt lại chỉ gửi tới hộp thư của chủ email nên cũng là bằng chứng sở hữu email
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
