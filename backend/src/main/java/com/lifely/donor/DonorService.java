package com.lifely.donor;

import com.lifely.common.AppException;
import com.lifely.donor.dto.*;
import com.lifely.matching.MatchRepository;
import com.lifely.notification.NotificationRepository;
import com.lifely.user.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

@Service
public class DonorService {

    private final DonorProfileRepository profileRepository;
    private final BloodTypeRepository bloodTypeRepository;
    private final DonationHistoryRepository historyRepository;
    private final UserRepository userRepository;
    private final PrivacySettingsRepository privacyRepository;
    private final MatchRepository matchRepository;
    private final NotificationRepository notificationRepository;

    public DonorService(DonorProfileRepository profileRepository, BloodTypeRepository bloodTypeRepository,
                        DonationHistoryRepository historyRepository, UserRepository userRepository,
                        PrivacySettingsRepository privacyRepository, MatchRepository matchRepository,
                        NotificationRepository notificationRepository) {
        this.profileRepository = profileRepository;
        this.bloodTypeRepository = bloodTypeRepository;
        this.historyRepository = historyRepository;
        this.userRepository = userRepository;
        this.privacyRepository = privacyRepository;
        this.matchRepository = matchRepository;
        this.notificationRepository = notificationRepository;
    }

    @Transactional(readOnly = true)
    public DonorProfileResponse getProfile(UUID userId) {
        return DonorProfileResponse.from(profile(userId), user(userId));
    }

    @Transactional
    public DonorProfileResponse updateProfile(UUID userId, UpdateDonorProfileRequest req) {
        User user = user(userId);
        DonorProfile profile = profile(userId);

        if (req.fullName() != null) user.setFullName(req.fullName().trim());
        if (req.phone() != null) user.setPhone(req.phone().trim());
        if (req.avatarUrl() != null) user.setAvatarUrl(req.avatarUrl());
        if (req.bloodType() != null) {
            profile.setBloodType(bloodTypeRepository.findByCode(req.bloodType())
                    .orElseThrow(() -> AppException.badRequest("INVALID_BLOOD_TYPE", "Nhóm máu không hợp lệ")));
        }
        if (req.city() != null) profile.setCity(req.city().trim());
        if (req.district() != null) profile.setDistrict(req.district().trim());
        if ((req.latitude() == null) != (req.longitude() == null)) {
            throw AppException.badRequest("INVALID_COORDINATES", "Phải cung cấp đồng thời vĩ độ và kinh độ");
        }
        if (req.latitude() != null) {
            profile.setLatitude(BigDecimal.valueOf(req.latitude()).setScale(6, RoundingMode.HALF_UP));
            profile.setLongitude(BigDecimal.valueOf(req.longitude()).setScale(6, RoundingMode.HALF_UP));
        }
        if (req.lastDonationDate() != null) profile.setLastDonationDate(req.lastDonationDate());

        userRepository.save(user);
        return DonorProfileResponse.from(profileRepository.save(profile), user);
    }

    @Transactional
    public DonorProfileResponse setAvailability(UUID userId, AvailabilityStatus status) {
        DonorProfile profile = profile(userId);
        if (status == AvailabilityStatus.AVAILABLE && (profile.getBloodType() == null || !profile.hasLocation())) {
            throw AppException.badRequest("PROFILE_INCOMPLETE",
                    "Hãy thêm nhóm máu và vị trí trước khi bật trạng thái sẵn sàng");
        }
        profile.setAvailabilityStatus(status);
        return DonorProfileResponse.from(profileRepository.save(profile), user(userId));
    }

    @Transactional(readOnly = true)
    public PrivacyDto getPrivacy(UUID userId) {
        return PrivacyDto.from(privacy(userId));
    }

    @Transactional
    public PrivacyDto updatePrivacy(UUID userId, PrivacyDto dto) {
        PrivacySettings p = privacy(userId);
        p.setShowApproximateLocation(dto.showApproximateLocation());
        p.setAllowEmergencyMatching(dto.allowEmergencyMatching());
        p.setReceiveEmergencyNotifications(dto.receiveEmergencyNotifications());
        p.setShowDonationCount(dto.showDonationCount());
        return PrivacyDto.from(privacyRepository.save(p));
    }

    @Transactional(readOnly = true)
    public List<DonationEntry> history(UUID userId) {
        return historyRepository.findByDonorIdOrderByDonatedOnDescCreatedAtDesc(profile(userId).getId())
                .stream().map(DonationEntry::from).toList();
    }

    @Transactional
    public DonationEntry addDonation(UUID userId, AddDonationRequest req) {
        DonorProfile profile = profile(userId);
        DonationHistory h = new DonationHistory();
        h.setDonorId(profile.getId());
        h.setDonatedOn(req.donatedOn());
        h.setLocation(req.location());
        h.setSource("SELF_REPORTED");
        historyRepository.save(h);
        profile.setTotalDonations(profile.getTotalDonations() + 1);
        if (profile.getLastDonationDate() == null || req.donatedOn().isAfter(profile.getLastDonationDate())) {
            profile.setLastDonationDate(req.donatedOn());
        }
        profileRepository.save(profile);
        return DonationEntry.from(h);
    }

    @Transactional(readOnly = true)
    public DonorDashboardResponse dashboard(UUID userId) {
        User user = user(userId);
        DonorProfile profile = profile(userId);
        long open = matchRepository.countOpenForDonor(profile.getId(), java.time.Instant.now());
        long unread = notificationRepository.countByUserIdAndReadFlagFalse(userId);
        return new DonorDashboardResponse(user.getFullName(),
                profile.getBloodType() == null ? null : profile.getBloodType().getCode(),
                profile.getAvailabilityStatus(), open, profile.getTotalDonations(), unread,
                profile.getBloodType() != null && profile.hasLocation());
    }

    public DonorProfile profile(UUID userId) {
        return profileRepository.findByUserId(userId)
                .orElseThrow(() -> AppException.notFound("DONOR_PROFILE_NOT_FOUND", "Không tìm thấy hồ sơ người hiến máu"));
    }

    private User user(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> AppException.notFound("USER_NOT_FOUND", "Không tìm thấy người dùng"));
    }

    private PrivacySettings privacy(UUID userId) {
        return privacyRepository.findById(userId).orElseGet(() -> privacyRepository.save(new PrivacySettings(userId)));
    }
}
