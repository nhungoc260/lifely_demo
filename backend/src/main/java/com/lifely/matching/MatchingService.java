package com.lifely.matching;

import com.lifely.common.BloodCompat;
import com.lifely.donor.AvailabilityStatus;
import com.lifely.donor.BloodType;
import com.lifely.donor.BloodTypeRepository;
import com.lifely.donor.DonorProfile;
import com.lifely.donor.DonorProfileRepository;
import com.lifely.notification.NotificationService;
import com.lifely.notification.NotificationType;
import com.lifely.notify.OutboxService;
import com.lifely.request.BloodRequest;
import com.lifely.request.BloodRequestRepository;
import com.lifely.request.RequestLifecycle;
import com.lifely.request.RequestStatus;
import com.lifely.request.Urgency;
import com.lifely.user.PrivacySettingsRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

/**
 * Bộ máy điều phối dựa trên luật (rule-based), không dùng AI:
 * Filter (SQL) -> Limit -> Calculate (Haversine + điểm) -> Sort -> Top N -> Notify.
 */
@Service
public class MatchingService {

    public record Candidate(DonorProfile donor, ScoreBreakdown score) {
    }

    private final DonorProfileRepository donorRepository;
    private final BloodTypeRepository bloodTypeRepository;
    private final MatchRepository matchRepository;
    private final MatchEventRepository eventRepository;
    private final PrivacySettingsRepository privacyRepository;
    private final RequestLifecycle lifecycle;
    private final BloodRequestRepository requestRepository;
    private final NotificationService notifications;
    private final MatchingProperties props;
    private final OutboxService outbox;

    public MatchingService(DonorProfileRepository donorRepository, BloodTypeRepository bloodTypeRepository,
                           MatchRepository matchRepository, MatchEventRepository eventRepository,
                           PrivacySettingsRepository privacyRepository, RequestLifecycle lifecycle,
                           BloodRequestRepository requestRepository, NotificationService notifications,
                           MatchingProperties props, OutboxService outbox) {
        this.donorRepository = donorRepository;
        this.bloodTypeRepository = bloodTypeRepository;
        this.matchRepository = matchRepository;
        this.eventRepository = eventRepository;
        this.privacyRepository = privacyRepository;
        this.lifecycle = lifecycle;
        this.requestRepository = requestRepository;
        this.notifications = notifications;
        this.props = props;
        this.outbox = outbox;
    }

    // ------------------------------------------------------------------ scoring

    /** Công thức nằm ở {@link ScoreCalculator} (thuần tính toán, có unit test riêng). */
    public ScoreBreakdown score(DonorProfile donor, BloodRequest request, Instant now) {
        return ScoreCalculator.score(donor.getBloodType().getCode(), donor.getLatitude().doubleValue(),
                donor.getLongitude().doubleValue(), donor.getAvailabilityStatus() == AvailabilityStatus.AVAILABLE,
                donor.getLastDonationDate(), request.getBloodType().getCode(), request.getLatitude().doubleValue(),
                request.getLongitude().doubleValue(), request.getDeadline(), now, LocalDate.now(), props);
    }

    // ------------------------------------------------------------------ ranking

    /** Lọc ở DB (giới hạn pool) -> tính Haversine/điểm -> sắp xếp -> lấy top. Không bao giờ load toàn bộ donor. */
    @Transactional(readOnly = true)
    public List<Candidate> rank(BloodRequest r, double minKm, double maxKm, int limit) {
        Instant now = Instant.now();
        List<Short> typeIds = bloodTypeRepository.findByCodeIn(
                        BloodCompat.compatibleDonorTypes(r.getBloodType().getCode()))
                .stream().map(BloodType::getId).toList();
        double lat = r.getLatitude().doubleValue();
        double lng = r.getLongitude().doubleValue();
        boolean nationwide = Double.isInfinite(maxKm);
        // Toàn quốc: không giới hạn bounding box, pool lớn hơn và đã sắp xếp gần nhất trước (ORDER BY ở repository).
        double dLat = nationwide ? 90.0 : maxKm / 111.0;
        double dLng = nationwide ? 180.0 : maxKm / (111.0 * Math.max(0.1, Math.cos(Math.toRadians(lat))));
        int poolSize = nationwide ? props.getCandidatePoolSizeNationwide() : props.getCandidatePoolSize();
        List<DonorProfile> pool = donorRepository.findCandidates(typeIds,
                bd(Math.max(-90, lat - dLat)), bd(Math.min(90, lat + dLat)),
                bd(Math.max(-180, lng - dLng)), bd(Math.min(180, lng + dLng)),
                LocalDate.now().minusDays(props.getMinDaysBetweenDonations()),
                LocalDate.now().minusDays(props.getMinDaysBetweenDonationsFemale()), r.getId(),
                bd(lat), bd(lng), PageRequest.of(0, poolSize));
        return pool.stream()
                // Một tài khoản vừa hiến vừa cần máu không bao giờ được ghép vào yêu cầu của chính mình.
                .filter(d -> !d.getUserId().equals(r.getRequesterId()))
                .map(d -> new Candidate(d, score(d, r, now)))
                .filter(c -> c.score().distanceKm() >= minKm && c.score().distanceKm() < maxKm)
                .filter(c -> c.score().deadlineFeasible())
                .sorted(Comparator.comparing(Candidate::score, ScoreCalculator.RANKING))
                .limit(limit)
                .toList();
    }

    // ------------------------------------------------------------------ workflow

    /** Gọi khi request được xác minh. Phải chạy trong transaction đã giữ khóa dòng của request. */
    @Transactional
    public void startMatching(BloodRequest r, UUID actorId) {
        boolean rare = props.isRare(r.getBloodType().getCode()) && props.isRareStartsNationwide();
        int startLevel = rare ? props.maxLevel() : 1;
        r.setEscalationLevel(startLevel);
        r.setLastEscalatedAt(Instant.now());
        lifecycle.transition(r, RequestStatus.MATCHING,
                rare ? "Nhóm máu hiếm " + r.getBloodType().getCode() + ": tìm người hiến trên toàn quốc ngay"
                        : "Bắt đầu tìm người hiến máu", actorId);
        int contacted = contactSkippingEmptyLevels(r, startLevel, actorId);
        if (contacted > 0) {
            lifecycle.transition(r, RequestStatus.DONORS_CONTACTED,
                    "Đã liên hệ " + contacted + " người hiến máu", actorId);
        } else {
            lifecycle.note(r, noDonorMessage(r), actorId);
        }
    }

    /** Leo thang một cấp nếu chưa đủ người và đã quá thời gian chờ theo mức khẩn cấp. */
    @Transactional
    public boolean escalate(UUID requestId) {
        BloodRequest r = requestRepository.findByIdForUpdate(requestId).orElse(null);
        Instant now = Instant.now();
        if (r == null || !r.getStatus().isActive() || !r.isVerified() || r.getUnitsConfirmed() >= r.getUnitsRequired()
                || r.getDeadline().isBefore(now) || r.getEscalationLevel() >= props.maxLevel()
                || !isDue(r, now)) {
            return false;
        }
        int fromLevel = r.getEscalationLevel() + 1;
        r.setLastEscalatedAt(now);
        int contacted = contactSkippingEmptyLevels(r, fromLevel, null);
        int level = r.getEscalationLevel();
        String scope = scopeLabel(level);
        notifications.notify(r.getRequesterId(), NotificationType.EMERGENCY_ESCALATION, "Đã mở rộng phạm vi tìm kiếm",
                "Chúng tôi đã mở rộng phạm vi tìm kiếm " + scope + " và liên hệ thêm " + contacted + " người hiến máu.",
                "REQUEST", r.getId());
        if (r.getStatus() == RequestStatus.MATCHING || r.getStatus() == RequestStatus.VERIFIED) {
            if (contacted > 0) {
                lifecycle.transition(r, RequestStatus.DONORS_CONTACTED, "Đã liên hệ " + contacted + " người hiến máu (cấp " + level + ")", null);
            } else {
                lifecycle.note(r, noDonorMessage(r), null);
            }
        } else {
            lifecycle.note(r, "Mở rộng tìm kiếm lên cấp " + level + " (" + scope + "), đã liên hệ thêm "
                    + contacted + " người hiến máu", null);
        }
        requestRepository.save(r);
        return true;
    }

    /** Danh sách id request đến hạn leo thang (job gọi escalate cho từng id trong transaction riêng). */
    @Transactional(readOnly = true)
    public List<UUID> findEscalationDue() {
        Instant now = Instant.now();
        return requestRepository.findByStatusInAndVerifiedTrueAndDeadlineAfter(RequestStatus.ACTIVE, now).stream()
                .filter(r -> r.getUnitsConfirmed() < r.getUnitsRequired())
                .filter(r -> r.getEscalationLevel() < props.maxLevel())
                .filter(r -> isDue(r, now))
                .map(BloodRequest::getId).toList();
    }

    /**
     * Liên hệ ở cấp {@code fromLevel}; nếu cấp đó không có ai phù hợp thì nhảy ngay sang cấp kế tiếp
     * (không chờ hết thời gian leo thang) cho tới khi có người hoặc hết cấp. Cập nhật escalationLevel của request.
     */
    private int contactSkippingEmptyLevels(BloodRequest r, int fromLevel, UUID actorId) {
        int level = fromLevel;
        int contacted = contactLevel(r, level);
        while (contacted == 0 && level < props.maxLevel()) {
            level++;
            contacted = contactLevel(r, level);
        }
        r.setEscalationLevel(level);
        return contacted;
    }

    private String scopeLabel(int level) {
        return props.isNationwide(level) ? "trên toàn quốc" : "tới " + (int) props.radiusOf(level) + " km";
    }

    private String noDonorMessage(BloodRequest r) {
        if (r.getEscalationLevel() >= props.maxLevel()) {
            return "Chưa có người hiến máu " + r.getBloodType().getCode()
                    + " phù hợp và kịp giờ trên toàn quốc. Hãy liên hệ ngân hàng máu bệnh viện hoặc Viện Huyết học - Truyền máu"
                    + " để điều chuyển đơn vị máu từ nơi khác.";
        }
        return "Chưa có người hiến máu phù hợp " + scopeLabel(r.getEscalationLevel())
                + ". Hệ thống sẽ tự động mở rộng phạm vi tìm kiếm.";
    }

    private boolean isDue(BloodRequest r, Instant now) {
        int minutes = switch (r.getUrgency()) {
            case CRITICAL -> props.getEscalationMinutesCritical();
            case URGENT -> props.getEscalationMinutesUrgent();
            case NORMAL -> props.getEscalationMinutesNormal();
        };
        Instant since = r.getLastEscalatedAt() != null ? r.getLastEscalatedAt() : r.getCreatedAt();
        return since == null || since.plus(Duration.ofMinutes(minutes)).isBefore(now);
    }

    /** Liên hệ donor ở một cấp bán kính. Trả về số donor đã được liên hệ. */
    private int contactLevel(BloodRequest r, int level) {
        List<Double> radii = props.getLevelRadiusKm();
        boolean nationwide = props.isNationwide(level);
        // Cấp toàn quốc luôn tính từ 0 km: người đã được liên hệ ở vòng trước đã bị loại bởi truy vấn (đã có match).
        double minKm = (level == 1 || nationwide) ? 0 : radii.get(level - 2);
        double maxKm = props.radiusOf(level);
        int needed = Math.max(1, r.unitsStillNeeded());
        boolean rare = props.isRare(r.getBloodType().getCode());
        int cap = rare ? props.getMaxContactsPerRoundRare() : props.getMaxContactsPerRound();
        int limit = Math.min(cap, needed * props.getCandidatesPerUnit());
        List<Candidate> chosen = rank(r, minKm, maxKm, limit);
        Instant now = Instant.now();
        for (Candidate c : chosen) {
            Match m = new Match();
            m.setRequestId(r.getId());
            m.setDonorId(c.donor().getId());
            m.setMatchingScore(BigDecimal.valueOf(c.score().total()).setScale(2, RoundingMode.HALF_UP));
            m.setDistanceKm(BigDecimal.valueOf(c.score().distanceKm()).setScale(2, RoundingMode.HALF_UP));
            m.setEscalationLevel(level);
            m.setStatus(MatchStatus.CONTACTED);
            m.setContactedAt(now);
            m = matchRepository.save(m);
            event(m.getId(), "CREATED", Map.of("score", c.score().total(), "distanceKm", c.score().distanceKm(),
                    "level", level));
            event(m.getId(), "CONTACTED", null);
            boolean wantsNotifications = privacyRepository.findById(c.donor().getUserId())
                    .map(p -> p.isReceiveEmergencyNotifications()).orElse(true);
            if (wantsNotifications) {
                boolean emergency = r.getUrgency() != Urgency.NORMAL;
                notifications.notify(c.donor().getUserId(), NotificationType.NEW_MATCH,
                        emergency ? "Yêu cầu khẩn cấp gần bạn" : "Yêu cầu hiến máu gần bạn",
                        "Cần máu " + r.getBloodType().getCode() + " tại " + r.getHospitalName() + ", cách bạn "
                                + c.score().distanceKm() + " km.",
                        "MATCH", m.getId());
                // SMS (mặc định mock) và Web Push qua outbox: chỉ khi kênh bật VÀ người hiến đã đồng ý kênh đó (kiểm tra trong enqueue).
                // Nội dung không chứa dữ liệu bệnh nhân và không khẳng định người hiến đủ điều kiện.
                String blood = r.getBloodType().getCode();
                outbox.enqueue(c.donor().getUserId(), OutboxService.Channel.SMS, OutboxService.PURPOSE_INVITE, "REQUEST",
                        r.getId(), outbox.inviteSms(blood, r.getHospitalName()), "SMS:INVITE:" + m.getId());
                outbox.enqueuePush(c.donor().getUserId(), OutboxService.PURPOSE_INVITE, "REQUEST", r.getId(),
                        "Có người cần máu gần bạn", "Nhóm " + blood + " tại " + r.getHospitalName()
                                + ". Mở LIFELY để xem và phản hồi.", "/donor/requests", "PUSH:INVITE:" + m.getId());
            }
        }
        return chosen.size();
    }

    // ------------------------------------------------------------------ closing matches

    /** Hủy mọi match chưa kết thúc (kể cả đã accept) khi request bị hủy. */
    @Transactional
    public void cancelOpenMatches(BloodRequest r, boolean notifyDonors) {
        outbox.cancelPending("REQUEST", r.getId(), null);   // dừng mọi SMS/push chưa gửi của yêu cầu này
        for (Match m : matchRepository.findByRequestIdAndStatusIn(r.getId(), MatchStatus.NOT_FINAL)) {
            m.setStatus(MatchStatus.CANCELLED);
            matchRepository.save(m);
            event(m.getId(), "CANCELLED", null);
            if (notifyDonors) {
                donorRepository.findById(m.getDonorId()).ifPresent(d -> notifications.notify(d.getUserId(),
                        NotificationType.REQUEST_CANCELLED, "Yêu cầu đã bị hủy",
                        "Yêu cầu máu " + r.getBloodType().getCode() + " tại " + r.getHospitalName()
                                + " đã bị hủy. Cảm ơn bạn đã sẵn sàng giúp đỡ.", "REQUEST", r.getId()));
            }
        }
    }

    /** Khi request hết hạn: các match chưa phản hồi hết hiệu lực. Donor đã accept giữ nguyên để lưu vết. */
    @Transactional
    public void expireOpenMatches(BloodRequest r) {
        outbox.cancelPending("REQUEST", r.getId(), null);
        for (Match m : matchRepository.findByRequestIdAndStatusIn(r.getId(), MatchStatus.AWAITING_RESPONSE)) {
            m.setStatus(MatchStatus.EXPIRED);
            matchRepository.save(m);
            event(m.getId(), "EXPIRED", null);
        }
    }

    /**
     * Khi yêu cầu đã đủ người nhận lời (hoặc đã đủ lượng được xác nhận): dừng mời thêm, các lời mời chưa phản hồi hết hiệu lực,
     * SMS/cuộc gọi mời chưa gửi bị hủy và người hiến còn chờ được báo để không ai đến vô ích.
     */
    @Transactional
    public void closeRemainingAfterFulfilled(BloodRequest r) {
        outbox.cancelPending("REQUEST", r.getId(), OutboxService.PURPOSE_INVITE);
        for (Match m : matchRepository.findByRequestIdAndStatusIn(r.getId(), MatchStatus.AWAITING_RESPONSE)) {
            m.setStatus(MatchStatus.EXPIRED);
            matchRepository.save(m);
            event(m.getId(), "EXPIRED", Map.of("reason", "REQUEST_FULFILLED"));
            donorRepository.findById(m.getDonorId()).ifPresent(d -> notifications.notify(d.getUserId(),
                    NotificationType.SYSTEM, "Yêu cầu đã đủ người nhận lời",
                    "Đã đủ người nhận lời cho yêu cầu " + r.getBloodType().getCode() + " tại "
                            + r.getHospitalName() + ". Cảm ơn bạn đã phản hồi.", "REQUEST", r.getId()));
        }
    }

    void event(UUID matchId, String type, Map<String, Object> metadata) {
        MatchEvent e = new MatchEvent();
        e.setMatchId(matchId);
        e.setEventType(type);
        e.setMetadata(metadata);
        eventRepository.save(e);
    }

    private static BigDecimal bd(double v) {
        return BigDecimal.valueOf(v).setScale(6, RoundingMode.HALF_UP);
    }
}
