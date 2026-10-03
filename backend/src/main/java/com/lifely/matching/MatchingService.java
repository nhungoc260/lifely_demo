package com.lifely.matching;

import com.lifely.common.BloodCompat;
import com.lifely.common.GeoUtils;
import com.lifely.donor.AvailabilityStatus;
import com.lifely.donor.BloodType;
import com.lifely.donor.BloodTypeRepository;
import com.lifely.donor.DonorProfile;
import com.lifely.donor.DonorProfileRepository;
import com.lifely.notification.NotificationService;
import com.lifely.notification.NotificationType;
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
import java.time.temporal.ChronoUnit;
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

    public MatchingService(DonorProfileRepository donorRepository, BloodTypeRepository bloodTypeRepository,
                           MatchRepository matchRepository, MatchEventRepository eventRepository,
                           PrivacySettingsRepository privacyRepository, RequestLifecycle lifecycle,
                           BloodRequestRepository requestRepository, NotificationService notifications,
                           MatchingProperties props) {
        this.donorRepository = donorRepository;
        this.bloodTypeRepository = bloodTypeRepository;
        this.matchRepository = matchRepository;
        this.eventRepository = eventRepository;
        this.privacyRepository = privacyRepository;
        this.lifecycle = lifecycle;
        this.requestRepository = requestRepository;
        this.notifications = notifications;
        this.props = props;
    }

    // ------------------------------------------------------------------ scoring

    /** Trọng số: tương thích 40, khoảng cách 25, sẵn sàng 15, kịp deadline 10, độ gần lần hiến trước 10. */
    public ScoreBreakdown score(DonorProfile donor, BloodRequest request, Instant now) {
        double distKm = GeoUtils.haversineKm(donor.getLatitude().doubleValue(), donor.getLongitude().doubleValue(),
                request.getLatitude().doubleValue(), request.getLongitude().doubleValue());
        boolean exact = donor.getBloodType().getCode().equals(request.getBloodType().getCode());
        double compat = exact ? 100 : 85;
        double dist = Math.max(0, 1 - distKm / props.getDistanceScoreRangeKm()) * 100;
        double avail = donor.getAvailabilityStatus() == AvailabilityStatus.AVAILABLE ? 100 : 0;

        double minutesLeft = Duration.between(now, request.getDeadline()).toSeconds() / 60.0;
        double minutesNeeded = distKm / props.getAverageSpeedKmh() * 60 + props.getPrepMinutes();
        boolean feasible = minutesLeft >= minutesNeeded;
        double deadline = feasible ? Math.min(1, (minutesLeft - minutesNeeded) / minutesNeeded) * 100 : 0;

        double recency = 100;
        if (donor.getLastDonationDate() != null) {
            long days = ChronoUnit.DAYS.between(donor.getLastDonationDate(), LocalDate.now());
            int min = props.getMinDaysBetweenDonations();
            recency = days >= 2L * min ? 100 : 60 + 40.0 * Math.max(0, days - min) / min;
        }
        double total = 0.40 * compat + 0.25 * dist + 0.15 * avail + 0.10 * deadline + 0.10 * recency;
        return new ScoreBreakdown(GeoUtils.round2(total), GeoUtils.round2(compat), GeoUtils.round2(dist),
                GeoUtils.round2(avail), GeoUtils.round2(deadline), GeoUtils.round2(recency), exact,
                GeoUtils.round2(distKm), feasible);
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
        double dLat = maxKm / 111.0;
        double dLng = maxKm / (111.0 * Math.max(0.1, Math.cos(Math.toRadians(lat))));
        List<DonorProfile> pool = donorRepository.findCandidates(typeIds,
                bd(lat - dLat), bd(lat + dLat), bd(lng - dLng), bd(lng + dLng),
                LocalDate.now().minusDays(props.getMinDaysBetweenDonations()), r.getId(),
                PageRequest.of(0, props.getCandidatePoolSize()));
        return pool.stream()
                .map(d -> new Candidate(d, score(d, r, now)))
                .filter(c -> c.score().distanceKm() >= minKm && c.score().distanceKm() < maxKm)
                .filter(c -> c.score().deadlineFeasible())
                .sorted(Comparator.comparingDouble((Candidate c) -> c.score().total()).reversed())
                .limit(limit)
                .toList();
    }

    // ------------------------------------------------------------------ workflow

    /** Gọi khi request được xác minh. Phải chạy trong transaction đã giữ khóa dòng của request. */
    @Transactional
    public void startMatching(BloodRequest r, UUID actorId) {
        r.setEscalationLevel(1);
        r.setLastEscalatedAt(Instant.now());
        lifecycle.transition(r, RequestStatus.MATCHING, "Matching started", actorId);
        int contacted = contactLevel(r, 1);
        if (contacted > 0) {
            lifecycle.transition(r, RequestStatus.DONORS_CONTACTED,
                    contacted + (contacted == 1 ? " donor contacted" : " donors contacted"), actorId);
        } else {
            lifecycle.note(r, "No suitable donors within " + props.getLevelRadiusKm().get(0).intValue()
                    + " km yet. The search will widen automatically.", actorId);
        }
    }

    /** Leo thang một cấp nếu chưa đủ người và đã quá thời gian chờ theo mức khẩn cấp. */
    @Transactional
    public boolean escalate(UUID requestId) {
        BloodRequest r = requestRepository.findByIdForUpdate(requestId).orElse(null);
        Instant now = Instant.now();
        if (r == null || !r.getStatus().isActive() || !r.isVerified() || r.getUnitsConfirmed() >= r.getUnitsRequired()
                || r.getDeadline().isBefore(now) || r.getEscalationLevel() >= props.getLevelRadiusKm().size()
                || !isDue(r, now)) {
            return false;
        }
        int level = r.getEscalationLevel() + 1;
        r.setEscalationLevel(level);
        r.setLastEscalatedAt(now);
        int contacted = contactLevel(r, level);
        double radius = props.getLevelRadiusKm().get(level - 1);
        notifications.notify(r.getRequesterId(), NotificationType.EMERGENCY_ESCALATION, "Search area widened",
                "We widened the search to " + (int) radius + " km and contacted " + contacted + " more donor(s).",
                "REQUEST", r.getId());
        if (r.getStatus() == RequestStatus.MATCHING || r.getStatus() == RequestStatus.VERIFIED) {
            if (contacted > 0) {
                lifecycle.transition(r, RequestStatus.DONORS_CONTACTED, contacted + " donors contacted (level " + level + ")", null);
            } else {
                lifecycle.note(r, "Search widened to level " + level + " (" + (int) radius + " km), no new donors found", null);
            }
        } else {
            lifecycle.note(r, "Search widened to level " + level + " (" + (int) radius + " km), "
                    + contacted + " more donors contacted", null);
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
                .filter(r -> r.getEscalationLevel() < props.getLevelRadiusKm().size())
                .filter(r -> isDue(r, now))
                .map(BloodRequest::getId).toList();
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
        double minKm = level == 1 ? 0 : radii.get(level - 2);
        double maxKm = radii.get(level - 1);
        int needed = Math.max(1, r.unitsStillNeeded());
        int limit = Math.min(props.getMaxContactsPerRound(), needed * props.getCandidatesPerUnit());
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
                        emergency ? "Emergency request near you" : "Blood request near you",
                        r.getBloodType().getCode() + " needed at " + r.getHospitalName() + ", "
                                + c.score().distanceKm() + " km away.",
                        "MATCH", m.getId());
            }
        }
        return chosen.size();
    }

    // ------------------------------------------------------------------ closing matches

    /** Hủy mọi match chưa kết thúc (kể cả đã accept) khi request bị hủy. */
    @Transactional
    public void cancelOpenMatches(BloodRequest r, boolean notifyDonors) {
        for (Match m : matchRepository.findByRequestIdAndStatusIn(r.getId(), MatchStatus.NOT_FINAL)) {
            m.setStatus(MatchStatus.CANCELLED);
            matchRepository.save(m);
            event(m.getId(), "CANCELLED", null);
            if (notifyDonors) {
                donorRepository.findById(m.getDonorId()).ifPresent(d -> notifications.notify(d.getUserId(),
                        NotificationType.REQUEST_CANCELLED, "Request cancelled",
                        "The " + r.getBloodType().getCode() + " request at " + r.getHospitalName()
                                + " was cancelled. Thank you for being ready to help.", "REQUEST", r.getId()));
            }
        }
    }

    /** Khi request hết hạn: các match chưa phản hồi hết hiệu lực. Donor đã accept giữ nguyên để lưu vết. */
    @Transactional
    public void expireOpenMatches(BloodRequest r) {
        for (Match m : matchRepository.findByRequestIdAndStatusIn(r.getId(), MatchStatus.AWAITING_RESPONSE)) {
            m.setStatus(MatchStatus.EXPIRED);
            matchRepository.save(m);
            event(m.getId(), "EXPIRED", null);
        }
    }

    /** Khi request đã đủ người: các donor còn chờ được thông báo để không ai đến vô ích. */
    @Transactional
    public void closeRemainingAfterFulfilled(BloodRequest r) {
        for (Match m : matchRepository.findByRequestIdAndStatusIn(r.getId(), MatchStatus.AWAITING_RESPONSE)) {
            m.setStatus(MatchStatus.EXPIRED);
            matchRepository.save(m);
            event(m.getId(), "EXPIRED", Map.of("reason", "REQUEST_FULFILLED"));
            donorRepository.findById(m.getDonorId()).ifPresent(d -> notifications.notify(d.getUserId(),
                    NotificationType.SYSTEM, "Request fulfilled",
                    "Enough donors have confirmed for the " + r.getBloodType().getCode() + " request at "
                            + r.getHospitalName() + ". Thank you for responding.", "REQUEST", r.getId()));
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
