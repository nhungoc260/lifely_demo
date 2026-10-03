package com.lifely.auth;

import com.lifely.audit.AuditAction;
import com.lifely.audit.AuditService;
import com.lifely.auth.dto.*;
import com.lifely.common.AppException;
import com.lifely.donor.DonorProfile;
import com.lifely.donor.DonorProfileRepository;
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
    private final boolean logResetLink;
    private final String frontendUrl;
    private final SecureRandom random = new SecureRandom();

    public AuthService(UserRepository userRepository, RoleRepository roleRepository,
                       PrivacySettingsRepository privacyRepository, DonorProfileRepository donorProfileRepository,
                       PasswordResetTokenRepository resetTokenRepository, PasswordEncoder passwordEncoder,
                       JwtService jwtService, AuditService auditService,
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
        this.logResetLink = logResetLink;
        this.frontendUrl = frontendUrl;
        this.dummyHash = passwordEncoder.encode("not-a-real-password");
    }

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (!req.password().equals(req.confirmPassword())) {
            throw AppException.badRequest("PASSWORD_MISMATCH", "Passwords do not match");
        }
        String email = req.email().trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw AppException.conflict("EMAIL_TAKEN", "An account with this email already exists");
        }
        String roleName = "ROLE_" + req.role();
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> AppException.badRequest("INVALID_ROLE", "Unknown role"));

        User user = new User();
        user.setEmail(email);
        user.setFullName(req.fullName().trim());
        user.setPhone(req.phone().trim());
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user.setRoles(new HashSet<>(java.util.List.of(role)));
        user = userRepository.save(user);

        privacyRepository.save(new PrivacySettings(user.getId()));
        if (Role.DONOR.equals(roleName)) {
            donorProfileRepository.save(new DonorProfile(user.getId()));
        }
        auditService.log(user.getId(), AuditAction.USER_REGISTERED, "USER", user.getId(), Map.of("role", req.role()));
        return buildAuthResponse(user);
    }

    /** Không @Transactional ở mức method để bộ đếm đăng nhập sai vẫn được lưu khi ném lỗi. */
    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmailIgnoreCase(req.email().trim()).orElse(null);
        if (user == null) {
            passwordEncoder.matches(req.password(), dummyHash);
            throw AppException.unauthorized("INVALID_CREDENTIALS", "Email or password is incorrect");
        }
        Instant now = Instant.now();
        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(now)) {
            throw new AppException(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS, "ACCOUNT_LOCKED",
                    "Too many failed attempts. Try again in a few minutes or reset your password.");
        }
        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            registerFailure(user, now);
            throw AppException.unauthorized("INVALID_CREDENTIALS", "Email or password is incorrect");
        }
        if (user.getStatus() == UserStatus.SUSPENDED) {
            throw AppException.forbidden("ACCOUNT_SUSPENDED", "This account has been suspended. Contact support.");
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
            // Prototype chưa tích hợp email/SMS. Ở môi trường dev, link đặt lại được ghi vào log máy chủ.
            if (logResetLink) {
                log.info("[DEV ONLY] Password reset link for {}: {}/reset-password?token={}",
                        user.getEmail(), frontendUrl, token);
            }
        });
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest req) {
        PasswordResetToken token = resetTokenRepository.findByTokenHash(sha256(req.token()))
                .filter(t -> t.getUsedAt() == null && t.getExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> AppException.badRequest("INVALID_RESET_TOKEN",
                        "This reset link is invalid or has expired"));
        User user = userRepository.findById(token.getUserId())
                .orElseThrow(() -> AppException.badRequest("INVALID_RESET_TOKEN", "This reset link is invalid or has expired"));
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        token.setUsedAt(Instant.now());
        userRepository.save(user);
        resetTokenRepository.save(token);
        auditService.log(user.getId(), AuditAction.PASSWORD_RESET, "USER", user.getId());
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
