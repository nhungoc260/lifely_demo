package com.lifely.user;

import com.lifely.audit.AuditAction;
import com.lifely.audit.AuditService;
import com.lifely.auth.AuthUser;
import com.lifely.auth.GoogleIdTokenVerifier;
import com.lifely.auth.PasswordResetTokenRepository;
import com.lifely.common.AppException;
import com.lifely.donor.DonationHistory;
import com.lifely.donor.DonationHistoryRepository;
import com.lifely.donor.AvailabilityStatus;
import com.lifely.donor.DonorProfileRepository;
import com.lifely.matching.Match;
import com.lifely.matching.MatchRepository;
import com.lifely.matching.MatchStatus;
import com.lifely.notification.NotificationRepository;
import com.lifely.request.BloodRequest;
import com.lifely.request.BloodRequestRepository;
import com.lifely.request.RequestService;
import com.lifely.request.RequestStatus;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

/**
 * Quyền của chủ dữ liệu: tải xuống toàn bộ dữ liệu của mình và xóa tài khoản.
 * Xóa tài khoản = ẩn danh hóa (không xóa cứng) để các yêu cầu và audit log vẫn truy vết được
 * mà không còn thông tin nhận dạng cá nhân.
 */
@Service
public class UserDataService {

    private final UserRepository userRepository;
    private final PrivacySettingsRepository privacyRepository;
    private final DonorProfileRepository donorRepository;
    private final DonationHistoryRepository historyRepository;
    private final MatchRepository matchRepository;
    private final NotificationRepository notificationRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final BloodRequestRepository requestRepository;
    private final RequestService requestService;
    private final PasswordEncoder passwordEncoder;
    private final GoogleIdTokenVerifier googleVerifier;
    private final AuditService audit;

    public UserDataService(UserRepository userRepository, PrivacySettingsRepository privacyRepository,
                           DonorProfileRepository donorRepository, DonationHistoryRepository historyRepository,
                           MatchRepository matchRepository, NotificationRepository notificationRepository,
                           PasswordResetTokenRepository resetTokenRepository, BloodRequestRepository requestRepository,
                           RequestService requestService, PasswordEncoder passwordEncoder,
                           GoogleIdTokenVerifier googleVerifier, AuditService audit) {
        this.userRepository = userRepository;
        this.privacyRepository = privacyRepository;
        this.donorRepository = donorRepository;
        this.historyRepository = historyRepository;
        this.matchRepository = matchRepository;
        this.notificationRepository = notificationRepository;
        this.resetTokenRepository = resetTokenRepository;
        this.requestRepository = requestRepository;
        this.requestService = requestService;
        this.passwordEncoder = passwordEncoder;
        this.googleVerifier = googleVerifier;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> export(AuthUser auth) {
        User u = load(auth.getId());
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("exportedAt", Instant.now().toString());

        Map<String, Object> account = new LinkedHashMap<>();
        account.put("id", u.getId());
        account.put("email", u.getEmail());
        account.put("fullName", u.getFullName());
        account.put("phone", u.getPhone());
        account.put("roles", u.getRoles().stream().map(Role::getName).sorted().toList());
        account.put("createdAt", u.getCreatedAt());
        out.put("account", account);

        privacyRepository.findById(u.getId()).ifPresent(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("showApproximateLocation", p.isShowApproximateLocation());
            m.put("allowEmergencyMatching", p.isAllowEmergencyMatching());
            m.put("receiveEmergencyNotifications", p.isReceiveEmergencyNotifications());
            m.put("showDonationCount", p.isShowDonationCount());
            out.put("privacy", m);
        });

        donorRepository.findByUserId(u.getId()).ifPresent(d -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("bloodType", d.getBloodType() == null ? null : d.getBloodType().getCode());
            m.put("city", d.getCity());
            m.put("district", d.getDistrict());
            m.put("latitude", d.getLatitude());
            m.put("longitude", d.getLongitude());
            m.put("lastDonationDate", d.getLastDonationDate());
            m.put("availability", d.getAvailabilityStatus());
            m.put("totalDonations", d.getTotalDonations());
            out.put("donorProfile", m);
            out.put("donationHistory", historyRepository.findByDonorIdOrderByDonatedOnDescCreatedAtDesc(d.getId())
                    .stream().map(h -> Map.of("donatedOn", String.valueOf(h.getDonatedOn()),
                            "location", String.valueOf(h.getLocation()), "source", String.valueOf(h.getSource()))).toList());
            out.put("matches", matchRepository.findByDonorIdOrderByCreatedAtDesc(d.getId()).stream()
                    .map(x -> Map.of("requestId", x.getRequestId().toString(), "status", x.getStatus().name(),
                            "matchingScore", x.getMatchingScore(), "distanceKm", x.getDistanceKm(),
                            "createdAt", String.valueOf(x.getCreatedAt()))).toList());
        });

        out.put("requestsCreated", requestRepository.findByRequesterIdOrderByCreatedAtDesc(u.getId()).stream()
                .map(r -> Map.of("id", r.getId().toString(), "bloodType", r.getBloodType().getCode(),
                        "units", r.getUnitsRequired(), "status", r.getStatus().name(),
                        "hospital", String.valueOf(r.getHospitalName()), "createdAt", String.valueOf(r.getCreatedAt()))).toList());
        audit.log(u.getId(), AuditAction.ACCOUNT_EXPORTED, "USER", u.getId());
        return out;
    }

    @Transactional
    public void deleteAccount(AuthUser auth, String password, String googleCredential) {
        User u = load(auth.getId());
        if (u.hasRole(Role.ADMIN)) {
            throw AppException.forbidden("CANNOT_DELETE_ADMIN", "Không thể xóa tài khoản admin tại đây");
        }
        if (u.hasRole(Role.ORGANIZATION)) {
            throw AppException.forbidden("ORGANIZATION_CONTACT_SUPPORT",
                    "Tài khoản tổ chức gắn với các hồ sơ đã xác minh. Vui lòng liên hệ nhân viên để đóng tài khoản.");
        }
        if (googleCredential != null && !googleCredential.isBlank()) {
            // Tài khoản tạo bằng Google không có mật khẩu dùng được: xác nhận bằng cách đăng nhập lại Google,
            // và email Google phải trùng với email của tài khoản.
            GoogleIdTokenVerifier.GoogleProfile profile = googleVerifier.verify(googleCredential);
            if (!profile.email().equalsIgnoreCase(u.getEmail())) {
                throw new AppException(HttpStatus.FORBIDDEN, "WRONG_GOOGLE_ACCOUNT",
                        "Tài khoản Google này không trùng với email của tài khoản LIFELY");
            }
        } else if (password == null || password.isBlank() || !passwordEncoder.matches(password, u.getPasswordHash())) {
            throw new AppException(HttpStatus.FORBIDDEN, "WRONG_PASSWORD", "Mật khẩu không đúng");
        }

        // 1) yêu cầu đang mở của người này được hủy (donor liên quan được thông báo)
        for (BloodRequest r : requestRepository.findByRequesterIdAndStatusIn(u.getId(), RequestStatus.CANCELLABLE)) {
            requestService.cancel(auth, r.getId(), "Tài khoản đã bị xóa");
        }
        // 2) hồ sơ donor: gỡ mọi dữ liệu nhận dạng và vị trí, thôi tham gia matching
        donorRepository.findByUserId(u.getId()).ifPresent(d -> {
            for (Match m : matchRepository.findByDonorIdOrderByCreatedAtDesc(d.getId())) {
                if (MatchStatus.AWAITING_RESPONSE.contains(m.getStatus())) {
                    m.setStatus(MatchStatus.CANCELLED);
                    matchRepository.save(m);
                }
            }
            List<DonationHistory> history = historyRepository.findByDonorIdOrderByDonatedOnDescCreatedAtDesc(d.getId());
            historyRepository.deleteAll(history);
            d.setAvailabilityStatus(AvailabilityStatus.NOT_AVAILABLE);
            d.setBloodType(null);
            d.setCity(null);
            d.setDistrict(null);
            d.setLatitude(null);
            d.setLongitude(null);
            d.setLastDonationDate(null);
            d.setTotalDonations(0);
            donorRepository.save(d);
        });
        notificationRepository.deleteAllForUser(u.getId());
        resetTokenRepository.deleteByUserId(u.getId());

        // 3) ẩn danh hóa tài khoản và khóa đăng nhập vĩnh viễn
        u.setEmail("deleted-" + u.getId() + "@deleted.invalid");
        u.setFullName("Người dùng đã xóa");
        u.setPhone("0000000000");
        u.setAvatarUrl(null);
        u.setStatus(UserStatus.SUSPENDED);
        u.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
        userRepository.save(u);
        audit.log(u.getId(), AuditAction.ACCOUNT_DELETED, "USER", u.getId());
    }

    private User load(UUID id) {
        return userRepository.findById(id).orElseThrow(() -> AppException.notFound("USER_NOT_FOUND", "Không tìm thấy người dùng"));
    }
}
