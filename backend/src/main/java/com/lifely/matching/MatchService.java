package com.lifely.matching;

import com.lifely.audit.AuditAction;
import com.lifely.audit.AuditService;
import com.lifely.auth.AuthUser;
import com.lifely.common.AppException;
import com.lifely.donor.DonationHistory;
import com.lifely.donor.DonationHistoryRepository;
import com.lifely.donor.DonorVerificationService;
import com.lifely.inventory.InventoryService;
import com.lifely.donor.VerificationLevel;
import com.lifely.donor.DonorProfile;
import com.lifely.donor.DonorProfileRepository;
import com.lifely.matching.dto.DonorMatchResponse;
import com.lifely.matching.dto.MatchExplanation;
import com.lifely.matching.dto.RequestMatchEntry;
import com.lifely.notification.NotificationService;
import com.lifely.notification.NotificationType;
import com.lifely.request.*;
import com.lifely.user.UserRepository;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class MatchService {

    private final MatchRepository matchRepository;
    private final MatchEventRepository eventRepository;
    private final DonorProfileRepository donorRepository;
    private final DonationHistoryRepository historyRepository;
    private final BloodRequestRepository requestRepository;
    private final RequestLifecycle lifecycle;
    private final RequestAccess access;
    private final MatchingService matchingService;
    private final NotificationService notifications;
    private final UserRepository userRepository;
    private final AuditService audit;
    private final EntityManager entityManager;
    private final DonorVerificationService verification;
    private final InventoryService inventory;

    public MatchService(MatchRepository matchRepository, MatchEventRepository eventRepository,
                        DonorProfileRepository donorRepository, DonationHistoryRepository historyRepository,
                        BloodRequestRepository requestRepository, RequestLifecycle lifecycle, RequestAccess access,
                        MatchingService matchingService, NotificationService notifications,
                        UserRepository userRepository, AuditService audit, EntityManager entityManager,
                        DonorVerificationService verification, InventoryService inventory) {
        this.matchRepository = matchRepository;
        this.eventRepository = eventRepository;
        this.donorRepository = donorRepository;
        this.historyRepository = historyRepository;
        this.requestRepository = requestRepository;
        this.lifecycle = lifecycle;
        this.access = access;
        this.matchingService = matchingService;
        this.notifications = notifications;
        this.userRepository = userRepository;
        this.audit = audit;
        this.entityManager = entityManager;
        this.verification = verification;
        this.inventory = inventory;
    }

    /**
     * Donor chấp nhận. Đảm bảo units_confirmed <= units_required khi nhiều donor bấm cùng lúc:
     * 1) khóa dòng request (SELECT ... FOR UPDATE) nên các giao dịch xếp hàng tuần tự;
     * 2) kiểm tra lại trạng thái và số lượng SAU KHI có khóa;
     * 3) CHECK constraint ck_req_units_confirmed ở DB là lưới an toàn cuối cùng.
     */
    @Transactional
    public DonorMatchResponse accept(AuthUser user, UUID matchId) {
        Match first = ownMatch(user, matchId);
        BloodRequest r = requestRepository.findByIdForUpdate(first.getRequestId())
                .orElseThrow(() -> AppException.notFound("REQUEST_NOT_FOUND", "Không tìm thấy yêu cầu"));
        entityManager.refresh(first);   // đọc lại match sau khi có khóa, tránh dữ liệu cũ
        Match m = first;
        if (!MatchStatus.AWAITING_RESPONSE.contains(m.getStatus())) {
            throw AppException.conflict("MATCH_ALREADY_RESPONDED", "Bạn đã phản hồi yêu cầu này rồi");
        }
        if (r.getUnitsConfirmed() >= r.getUnitsRequired() || r.getStatus() == RequestStatus.FULFILLED) {
            throw AppException.conflict("REQUEST_FULFILLED", "Yêu cầu này không còn nhận thêm người hiến máu");
        }
        if (!r.getStatus().isActive() || r.getDeadline().isBefore(Instant.now())) {
            throw AppException.conflict("REQUEST_CLOSED", "Yêu cầu này đã đóng");
        }

        r.setUnitsConfirmed(r.getUnitsConfirmed() + 1);
        m.setStatus(MatchStatus.ACCEPTED);
        m.setRespondedAt(Instant.now());
        matchRepository.save(m);
        matchingService.event(m.getId(), "ACCEPTED", null);

        int confirmed = r.getUnitsConfirmed();
        int required = r.getUnitsRequired();
        String progress = confirmed + " / " + required + " người hiến máu đã xác nhận";
        if (confirmed >= required) {
            lifecycle.transition(r, RequestStatus.FULFILLED, progress, user.getId());
            matchingService.closeRemainingAfterFulfilled(r);
        } else if (r.getStatus() != RequestStatus.PARTIALLY_FULFILLED) {
            lifecycle.transition(r, RequestStatus.PARTIALLY_FULFILLED, progress, user.getId());
        } else {
            requestRepository.save(r);
            lifecycle.note(r, progress, user.getId());
            lifecycle.publish(r);
        }
        notifications.notify(r.getRequesterId(), NotificationType.REQUEST_ACCEPTED,
                confirmed >= required ? "Đã đủ người hiến máu" : "Có người hiến máu đã nhận lời yêu cầu của bạn",
                "Yêu cầu " + r.getBloodType().getCode() + " của bạn hiện có " + progress + ".", "REQUEST", r.getId());
        audit.log(user.getId(), AuditAction.MATCH_ACCEPTED, "MATCH", m.getId(), Map.of("requestId", r.getId().toString()));
        return toDonorResponse(m, r, donorOf(m));
    }

    @Transactional
    public DonorMatchResponse reject(AuthUser user, UUID matchId) {
        Match first = ownMatch(user, matchId);
        BloodRequest r = requestRepository.findByIdForUpdate(first.getRequestId())
                .orElseThrow(() -> AppException.notFound("REQUEST_NOT_FOUND", "Không tìm thấy yêu cầu"));
        entityManager.refresh(first);
        if (!MatchStatus.AWAITING_RESPONSE.contains(first.getStatus())) {
            throw AppException.conflict("MATCH_ALREADY_RESPONDED", "Bạn đã phản hồi yêu cầu này rồi");
        }
        first.setStatus(MatchStatus.REJECTED);
        first.setRespondedAt(Instant.now());
        matchRepository.save(first);
        matchingService.event(first.getId(), "REJECTED", null);
        lifecycle.publish(r);
        audit.log(user.getId(), AuditAction.MATCH_REJECTED, "MATCH", first.getId(), Map.of("requestId", r.getId().toString()));
        return toDonorResponse(first, r, donorOf(first));
    }

    /** Requester/tổ chức/admin xác nhận donor đã hiến thành công: cập nhật hồ sơ và lịch sử của donor. */
    @Transactional
    public RequestMatchEntry complete(AuthUser user, UUID matchId) {
        Match first = matchRepository.findById(matchId)
                .orElseThrow(() -> AppException.notFound("MATCH_NOT_FOUND", "Không tìm thấy lượt kết nối"));
        BloodRequest r = requestRepository.findByIdForUpdate(first.getRequestId())
                .orElseThrow(() -> AppException.notFound("REQUEST_NOT_FOUND", "Không tìm thấy yêu cầu"));
        if (!access.canView(user.getId(), r)) {
            throw AppException.notFound("MATCH_NOT_FOUND", "Không tìm thấy lượt kết nối");
        }
        entityManager.refresh(first);
        DonorVerificationService.Confirmation confirmation = verification.confirmation(user.getId(), r);
        if (first.getStatus() == MatchStatus.COMPLETED && confirmation.level() == VerificationLevel.ORG_VERIFIED) {
            // Người nhà đã ghi nhận trước: cơ sở y tế của yêu cầu được nâng mức xác nhận, không cộng thêm lần hiến.
            upgradeToFacilityVerified(first, r, user, confirmation);
            return requesterEntry(first, 0);
        }
        if (first.getStatus() != MatchStatus.ACCEPTED) {
            throw AppException.conflict("MATCH_NOT_ACCEPTED", "Chỉ người hiến máu đã nhận lời mới được đánh dấu là đã hiến");
        }
        first.setStatus(MatchStatus.COMPLETED);
        matchRepository.save(first);
        matchingService.event(first.getId(), "COMPLETED", null);

        DonorProfile donor = donorOf(first);
        donor.setTotalDonations(donor.getTotalDonations() + 1);
        donor.setLastDonationDate(LocalDate.now());
        donorRepository.save(donor);
        DonationHistory h = new DonationHistory();
        h.setDonorId(donor.getId());
        h.setDonatedOn(LocalDate.now());
        h.setLocation(r.getHospitalName());
        h.setSource("LIFELY_MATCH");
        h.setMatchId(first.getId());
        applyConfirmation(h, user.getId(), confirmation);
        historyRepository.save(h);
        if (confirmation.level() == VerificationLevel.ORG_VERIFIED) {
            inventory.addDonatedUnit(confirmation.organizationId(), bloodCode(donor));
        }

        String by = confirmation.level() == VerificationLevel.ORG_VERIFIED
                ? " và được " + confirmation.organizationName() + " xác nhận" : "";
        notifications.notify(donor.getUserId(), NotificationType.SYSTEM, "Cảm ơn bạn đã hiến máu",
                "Lần hiến máu của bạn tại " + r.getHospitalName() + " đã được ghi nhận" + by + ".", "MATCH", first.getId());
        audit.log(user.getId(), AuditAction.MATCH_COMPLETED, "MATCH", first.getId(),
                Map.of("verificationLevel", confirmation.level().name()));
        return requesterEntry(first, 0);
    }

    private static String bloodCode(DonorProfile donor) {
        return donor.getBloodType() == null ? null : donor.getBloodType().getCode();
    }

    /** Ghi ai xác nhận và ở mức nào lên bản ghi lịch sử hiến máu. */
    private static void applyConfirmation(DonationHistory h, UUID confirmerUserId,
                                          DonorVerificationService.Confirmation confirmation) {
        h.setVerificationLevel(confirmation.level().name());
        h.setConfirmedByUserId(confirmerUserId);
        h.setConfirmedAt(Instant.now());
        h.setConfirmedByOrgId(confirmation.organizationId());
        h.setConfirmedByOrgName(confirmation.organizationName());
    }

    private void upgradeToFacilityVerified(Match match, BloodRequest r, AuthUser user,
                                           DonorVerificationService.Confirmation confirmation) {
        historyRepository.findFirstByMatchId(match.getId()).ifPresent(h -> {
            if (VerificationLevel.parse(h.getVerificationLevel()) == VerificationLevel.ORG_VERIFIED) {
                return;   // đã được cơ sở y tế xác nhận trước đó: không làm gì (idempotent)
            }
            applyConfirmation(h, user.getId(), confirmation);
            historyRepository.save(h);
            inventory.addDonatedUnit(confirmation.organizationId(), bloodCode(donorOf(match)));
            notifications.notify(donorOf(match).getUserId(), NotificationType.SYSTEM, "Lần hiến máu đã được xác nhận",
                    "Lần hiến máu của bạn tại " + r.getHospitalName() + " đã được " + confirmation.organizationName()
                            + " xác nhận.", "MATCH", match.getId());
            audit.log(user.getId(), AuditAction.MATCH_COMPLETED, "MATCH", match.getId(),
                    Map.of("verificationLevel", VerificationLevel.ORG_VERIFIED.name(), "upgraded", true));
        });
    }

    @Transactional(readOnly = true)
    public List<DonorMatchResponse> listForDonor(AuthUser user, MatchStatus status) {
        DonorProfile donor = donorRepository.findByUserId(user.getId())
                .orElseThrow(() -> AppException.notFound("DONOR_PROFILE_NOT_FOUND", "Không tìm thấy hồ sơ người hiến máu"));
        List<DonorMatchResponse> out = new ArrayList<>();
        for (Match m : matchRepository.findByDonorIdOrderByCreatedAtDesc(donor.getId())) {
            if (status != null && m.getStatus() != status) continue;
            BloodRequest r = requestRepository.findById(m.getRequestId()).orElse(null);
            if (r == null || !r.isVerified()) continue;
            out.add(toDonorResponse(m, r, donor));
        }
        return out;
    }

    @Transactional(readOnly = true)
    public DonorMatchResponse detailForDonor(AuthUser user, UUID matchId) {
        Match m = ownMatch(user, matchId);
        BloodRequest r = requestRepository.findById(m.getRequestId())
                .orElseThrow(() -> AppException.notFound("REQUEST_NOT_FOUND", "Không tìm thấy yêu cầu"));
        return toDonorResponse(m, r, donorOf(m));
    }

    @Transactional(readOnly = true)
    public List<RequestMatchEntry> listForRequest(AuthUser user, UUID requestId) {
        access.requireViewable(user.getId(), requestId);
        List<Match> matches = matchRepository.findByRequestIdOrderByMatchingScoreDesc(requestId);
        List<RequestMatchEntry> out = new ArrayList<>();
        for (int i = 0; i < matches.size(); i++) {
            out.add(requesterEntry(matches.get(i), i + 1));
        }
        return out;
    }

    // ------------------------------------------------------------------ helpers

    /** Chống IDOR: donor chỉ thao tác được trên match của chính mình; trả 404 nếu không phải của mình. */
    private Match ownMatch(AuthUser user, UUID matchId) {
        Match m = matchRepository.findById(matchId)
                .orElseThrow(() -> AppException.notFound("MATCH_NOT_FOUND", "Không tìm thấy lượt kết nối"));
        DonorProfile donor = donorRepository.findById(m.getDonorId())
                .orElseThrow(() -> AppException.notFound("MATCH_NOT_FOUND", "Không tìm thấy lượt kết nối"));
        if (!donor.getUserId().equals(user.getId())) {
            throw AppException.notFound("MATCH_NOT_FOUND", "Không tìm thấy lượt kết nối");
        }
        return m;
    }

    private DonorProfile donorOf(Match m) {
        return donorRepository.findById(m.getDonorId())
                .orElseThrow(() -> AppException.notFound("DONOR_PROFILE_NOT_FOUND", "Không tìm thấy hồ sơ người hiến máu"));
    }

    private DonorMatchResponse toDonorResponse(Match m, BloodRequest r, DonorProfile donor) {
        boolean showContact = m.getStatus() == MatchStatus.ACCEPTED || m.getStatus() == MatchStatus.COMPLETED;
        MatchExplanation explanation = donor.hasLocation()
                ? MatchExplanation.from(matchingService.score(donor, r, Instant.now()),
                donor.getAvailabilityStatus() == com.lifely.donor.AvailabilityStatus.AVAILABLE)
                : null;
        return new DonorMatchResponse(m.getId(), m.getStatus(), m.getMatchingScore().doubleValue(),
                m.getDistanceKm().doubleValue(), r.getId(), r.getBloodType().getCode(), r.unitsStillNeeded(),
                r.getUnitsRequired(), r.getUnitsConfirmed(), r.getUrgency(), r.getStatus(), r.getHospitalName(),
                r.getCity(), r.getDistrict(), r.getDeadline(), r.getDescription(),
                showContact ? r.getContactPhone() : null, explanation);
    }

    private RequestMatchEntry requesterEntry(Match m, int rank) {
        boolean reveal = m.getStatus() == MatchStatus.ACCEPTED || m.getStatus() == MatchStatus.COMPLETED;
        String name = null;
        String phone = null;
        if (reveal) {
            DonorProfile d = donorOf(m);
            var u = userRepository.findById(d.getUserId()).orElse(null);
            if (u != null) {
                name = u.getFullName();
                phone = u.getPhone();
            }
        }
        DonorVerificationService.Badge badge = verification.badge(m.getDonorId());
        return new RequestMatchEntry(m.getId(), rank > 0 ? "Người hiến #" + rank : "Người hiến", m.getDistanceKm().doubleValue(),
                m.getMatchingScore().doubleValue(), m.getStatus(), m.getRespondedAt(), name, phone,
                badge.facilityVerified(), badge.verifiedByName());
    }
}
