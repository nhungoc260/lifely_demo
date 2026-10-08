package com.lifely.request;

import com.lifely.audit.AuditAction;
import com.lifely.audit.AuditService;
import com.lifely.auth.AuthUser;
import com.lifely.common.AppException;
import com.lifely.common.PageResponse;
import com.lifely.common.Sanitizer;
import com.lifely.donor.BloodType;
import com.lifely.donor.BloodTypeRepository;
import com.lifely.matching.MatchRepository;
import com.lifely.matching.MatchStatus;
import com.lifely.matching.MatchingService;
import com.lifely.notification.NotificationService;
import com.lifely.notification.NotificationType;
import com.lifely.organization.Organization;
import com.lifely.organization.OrganizationRepository;
import com.lifely.request.dto.*;
import com.lifely.user.Role;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class RequestService {

    private static final int MAX_ACTIVE_PER_USER = 5;

    private final BloodRequestRepository requestRepository;
    private final BloodTypeRepository bloodTypeRepository;
    private final OrganizationRepository organizationRepository;
    private final RequestLifecycle lifecycle;
    private final RequestAccess access;
    private final MatchingService matchingService;
    private final MatchRepository matchRepository;
    private final NotificationService notifications;
    private final RequestStatusHistoryRepository historyRepository;
    private final AuditService audit;

    public RequestService(BloodRequestRepository requestRepository, BloodTypeRepository bloodTypeRepository,
                          OrganizationRepository organizationRepository, RequestLifecycle lifecycle,
                          RequestAccess access, MatchingService matchingService, MatchRepository matchRepository,
                          NotificationService notifications, RequestStatusHistoryRepository historyRepository,
                          AuditService audit) {
        this.requestRepository = requestRepository;
        this.bloodTypeRepository = bloodTypeRepository;
        this.organizationRepository = organizationRepository;
        this.lifecycle = lifecycle;
        this.access = access;
        this.matchingService = matchingService;
        this.matchRepository = matchRepository;
        this.notifications = notifications;
        this.historyRepository = historyRepository;
        this.audit = audit;
    }

    @Transactional
    public RequestResponse create(AuthUser user, CreateRequestDto dto) {
        Instant now = Instant.now();
        if (dto.deadline().isBefore(now.plus(Duration.ofMinutes(5)))) {
            throw AppException.badRequest("INVALID_DEADLINE", "Hạn chót phải cách hiện tại ít nhất 5 phút");
        }
        if (dto.deadline().isAfter(now.plus(Duration.ofDays(7)))) {
            throw AppException.badRequest("INVALID_DEADLINE", "Hạn chót không được quá 7 ngày");
        }
        if (requestRepository.countByRequesterIdAndStatusIn(user.getId(), RequestStatus.AWAITING_OR_ACTIVE)
                >= MAX_ACTIVE_PER_USER) {
            throw new AppException(HttpStatus.TOO_MANY_REQUESTS, "TOO_MANY_ACTIVE_REQUESTS",
                    "Bạn đang có " + MAX_ACTIVE_PER_USER + " yêu cầu mở. Hãy hủy hoặc hoàn tất một yêu cầu trước.");
        }
        BloodType bloodType = bloodTypeRepository.findByCode(dto.bloodType())
                .orElseThrow(() -> AppException.badRequest("INVALID_BLOOD_TYPE", "Nhóm máu không hợp lệ"));

        BloodRequest r = new BloodRequest();
        r.setRequesterId(user.getId());
        r.setBloodType(bloodType);
        r.setUnitsRequired(dto.unitsRequired());
        r.setUrgency(dto.urgency());
        r.setHospitalName(Sanitizer.plain(dto.hospitalName()));
        r.setCity(Sanitizer.plain(dto.city()));
        r.setDistrict(Sanitizer.plain(dto.district()));
        r.setLatitude(BigDecimal.valueOf(dto.latitude()).setScale(6, RoundingMode.HALF_UP));
        r.setLongitude(BigDecimal.valueOf(dto.longitude()).setScale(6, RoundingMode.HALF_UP));
        r.setDeadline(dto.deadline());
        r.setContactPhone(dto.contactPhone());
        r.setDescription(Sanitizer.plain(dto.description()));

        // Liên kết tổ chức: dùng tọa độ/tên của tổ chức ĐÃ XÁC MINH để không thể giả vị trí bệnh viện.
        Organization org = null;
        if (user.hasRole(Role.ORGANIZATION)) {
            org = organizationRepository.findByOwnerUserId(user.getId()).filter(Organization::isVerified).orElse(null);
        } else if (dto.organizationId() != null) {
            org = organizationRepository.findById(dto.organizationId()).filter(Organization::isVerified)
                    .orElseThrow(() -> AppException.badRequest("INVALID_ORGANIZATION",
                            "Hãy chọn bệnh viện đã xác minh trong danh sách"));
        }
        if (org != null) {
            r.setOrganizationId(org.getId());
            if (dto.organizationId() != null || org.getLatitude() == null) {
                r.setHospitalName(org.getName());
            }
            if (org.getLatitude() != null && org.getLongitude() != null && dto.organizationId() != null) {
                r.setLatitude(org.getLatitude());
                r.setLongitude(org.getLongitude());
                r.setCity(org.getCity());
                r.setDistrict(org.getDistrict());
            }
        }

        r = requestRepository.save(r);
        lifecycle.transition(r, RequestStatus.CREATED, "Đã tạo yêu cầu", user.getId());
        audit.log(user.getId(), AuditAction.REQUEST_CREATED, "REQUEST", r.getId(),
                Map.of("bloodType", dto.bloodType(), "units", dto.unitsRequired(), "urgency", dto.urgency().name()));

        // Tổ chức đã xác minh: yêu cầu được tin cậy ngay và vào điều phối luôn. Còn lại chờ admin xác minh.
        boolean autoVerified = user.hasRole(Role.ORGANIZATION) && org != null;
        lifecycle.transition(r, RequestStatus.PENDING_VERIFICATION, "Đã gửi để xác minh", user.getId());
        if (autoVerified) {
            markVerified(r, user.getId(), "Tự động xác minh: yêu cầu từ tổ chức đã xác minh");
        }
        return RequestResponse.from(r);
    }

    /** Dùng khi admin xác minh hoặc tổ chức đã xác minh tạo request. Sau đó khởi động matching. */
    @Transactional
    public void markVerified(BloodRequest r, UUID actorId, String note) {
        r.setVerified(true);
        r.setVerifiedBy(actorId);
        lifecycle.transition(r, RequestStatus.VERIFIED, note, actorId);
        notifications.notify(r.getRequesterId(), NotificationType.REQUEST_VERIFIED, "Yêu cầu đã được xác minh",
                "Yêu cầu " + r.getBloodType().getCode() + " của bạn đã được xác minh và chúng tôi đang tìm người hiến máu.",
                "REQUEST", r.getId());
        audit.log(actorId, AuditAction.REQUEST_VERIFIED, "REQUEST", r.getId());
        matchingService.startMatching(r, actorId);
    }

    @Transactional
    public RequestResponse verifyByAdmin(AuthUser admin, UUID id) {
        BloodRequest r = requestRepository.findByIdForUpdate(id)
                .orElseThrow(() -> AppException.notFound("REQUEST_NOT_FOUND", "Không tìm thấy yêu cầu"));
        if (r.getStatus() != RequestStatus.PENDING_VERIFICATION) {
            throw AppException.conflict("INVALID_STATE", "Chỉ yêu cầu đang chờ xác minh mới được xác minh");
        }
        if (r.getDeadline().isBefore(Instant.now())) {
            throw AppException.conflict("REQUEST_EXPIRED", "Yêu cầu này đã quá hạn");
        }
        markVerified(r, admin.getId(), "Admin đã xác minh");
        return RequestResponse.from(r);
    }

    @Transactional
    public RequestResponse rejectByAdmin(AuthUser admin, UUID id, String reason) {
        BloodRequest r = requestRepository.findByIdForUpdate(id)
                .orElseThrow(() -> AppException.notFound("REQUEST_NOT_FOUND", "Không tìm thấy yêu cầu"));
        if (r.getStatus() != RequestStatus.PENDING_VERIFICATION) {
            throw AppException.conflict("INVALID_STATE", "Chỉ yêu cầu đang chờ xác minh mới được từ chối");
        }
        String clean = Sanitizer.plain(reason);
        r.setCancelReason(clean == null ? "Admin đã từ chối" : clean);
        lifecycle.transition(r, RequestStatus.CANCELLED, "Admin đã từ chối", admin.getId());
        notifications.notify(r.getRequesterId(), NotificationType.REQUEST_REJECTED, "Yêu cầu không được chấp thuận",
                "Yêu cầu của bạn chưa được xác minh: " + r.getCancelReason(), "REQUEST", r.getId());
        audit.log(admin.getId(), AuditAction.REQUEST_REJECTED, "REQUEST", r.getId());
        return RequestResponse.from(r);
    }

    @Transactional
    public RequestResponse cancel(AuthUser user, UUID id, String reason) {
        BloodRequest r = requestRepository.findByIdForUpdate(id)
                .orElseThrow(() -> AppException.notFound("REQUEST_NOT_FOUND", "Không tìm thấy yêu cầu"));
        boolean admin = user.hasRole(Role.ADMIN);
        if (!admin && !access.canView(user.getId(), r)) {
            throw AppException.notFound("REQUEST_NOT_FOUND", "Không tìm thấy yêu cầu");
        }
        if (!RequestStatus.CANCELLABLE.contains(r.getStatus())) {
            throw AppException.conflict("REQUEST_NOT_CANCELLABLE", "Không thể hủy yêu cầu này nữa");
        }
        String clean = Sanitizer.plain(reason);
        r.setCancelReason(clean);
        lifecycle.transition(r, RequestStatus.CANCELLED, clean == null ? "Đã hủy" : "Đã hủy: " + clean, user.getId());
        matchingService.cancelOpenMatches(r, true);
        audit.log(user.getId(), AuditAction.REQUEST_CANCELLED, "REQUEST", r.getId());
        return RequestResponse.from(r);
    }

    @Transactional
    public RequestResponse update(AuthUser user, UUID id, UpdateRequestDto dto) {
        BloodRequest r = requestRepository.findByIdForUpdate(id)
                .orElseThrow(() -> AppException.notFound("REQUEST_NOT_FOUND", "Không tìm thấy yêu cầu"));
        if (!access.canView(user.getId(), r)) {
            throw AppException.notFound("REQUEST_NOT_FOUND", "Không tìm thấy yêu cầu");
        }
        if (!RequestStatus.CANCELLABLE.contains(r.getStatus())) {
            throw AppException.conflict("REQUEST_NOT_EDITABLE", "Không thể sửa yêu cầu này nữa");
        }
        if (dto.contactPhone() != null) r.setContactPhone(dto.contactPhone());
        if (dto.description() != null) r.setDescription(Sanitizer.plain(dto.description()));
        if (dto.deadline() != null) {
            if (dto.deadline().isBefore(r.getDeadline())) {
                throw AppException.badRequest("INVALID_DEADLINE", "Bạn chỉ có thể gia hạn, không thể rút ngắn hạn chót");
            }
            if (dto.deadline().isAfter(Instant.now().plus(Duration.ofDays(7)))) {
                throw AppException.badRequest("INVALID_DEADLINE", "Hạn chót không được quá 7 ngày");
            }
            r.setDeadline(dto.deadline());
        }
        return RequestResponse.from(requestRepository.save(r));
    }

    @Transactional(readOnly = true)
    public RequestResponse detail(AuthUser user, UUID id) {
        return RequestResponse.from(access.requireViewable(user.getId(), id));
    }

    @Transactional(readOnly = true)
    public List<HistoryEntry> history(AuthUser user, UUID id) {
        access.requireViewable(user.getId(), id);
        return historyRepository.findByRequestIdOrderByCreatedAtAsc(id).stream().map(HistoryEntry::from).toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<RequestResponse> listMine(AuthUser user, RequestStatus status, int page, int size) {
        Specification<BloodRequest> spec = (root, q, cb) -> {
            Predicate p = cb.equal(root.get("requesterId"), user.getId());
            return status == null ? p : cb.and(p, cb.equal(root.get("status"), status));
        };
        Page<BloodRequest> result = requestRepository.findAll(spec,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50), Sort.by("createdAt").descending()));
        return PageResponse.of(result, RequestResponse::from);
    }

    @Transactional(readOnly = true)
    public RequesterDashboard dashboard(AuthUser user) {
        long active = requestRepository.countByRequesterIdAndStatusIn(user.getId(), RequestStatus.AWAITING_OR_ACTIVE);
        long confirmed = requestRepository.sumConfirmedByRequester(user.getId());
        long responses = matchRepository.countResponsesForRequester(user.getId(),
                EnumSet.of(MatchStatus.ACCEPTED, MatchStatus.REJECTED, MatchStatus.COMPLETED));
        long completed = requestRepository.countByRequesterIdAndStatus(user.getId(), RequestStatus.FULFILLED);
        return new RequesterDashboard(active, confirmed, responses, completed);
    }
}
