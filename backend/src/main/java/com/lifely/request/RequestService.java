package com.lifely.request;

import com.lifely.admin.AdminAlerts;
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
import com.lifely.notify.StaffAlertService;
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
    private final RequestCreateGuard createGuard;
    private final StaffAlertService staffAlerts;
    private final AdminAlerts adminAlerts;

    public RequestService(BloodRequestRepository requestRepository, BloodTypeRepository bloodTypeRepository,
                          OrganizationRepository organizationRepository, RequestLifecycle lifecycle,
                          RequestAccess access, MatchingService matchingService, MatchRepository matchRepository,
                          NotificationService notifications, RequestStatusHistoryRepository historyRepository,
                          AuditService audit, RequestCreateGuard createGuard, StaffAlertService staffAlerts,
                          AdminAlerts adminAlerts) {
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
        this.createGuard = createGuard;
        this.staffAlerts = staffAlerts;
        this.adminAlerts = adminAlerts;
    }

    public RequestResponse create(AuthUser user, CreateRequestDto dto) {
        return create(user, dto, null);
    }

    /**
     * @param idempotencyKey khóa do client sinh cho MỖI lần gửi biểu mẫu (tùy chọn). Gửi lại cùng khóa trả về chính yêu cầu đã tạo,
     *                       không tạo bản thứ hai.
     */
    @Transactional
    public RequestResponse create(AuthUser user, CreateRequestDto dto, String idempotencyKey) {
        String key = idempotencyKey == null || idempotencyKey.isBlank() ? null : idempotencyKey.trim();
        if (key != null && !key.matches("[A-Za-z0-9_-]{8,64}")) {
            throw AppException.badRequest("INVALID_IDEMPOTENCY_KEY", "Khóa chống gửi trùng không hợp lệ");
        }
        createGuard.lockRequester(user.getId());   // từ đây các lần tạo của cùng người được xếp hàng tuần tự
        if (key != null) {
            var existing = requestRepository.findByRequesterIdAndIdempotencyKey(user.getId(), key);
            if (existing.isPresent()) {
                return RequestResponse.from(existing.get());
            }
        }
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
            org = organizationRepository.findForUser(user.getId()).filter(Organization::isVerified).orElse(null);
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

        // Chống tạo trùng ngoài ý muốn (nhiều tab, bấm lại) khi client không gửi khóa: cùng nhóm máu + cơ sở trong 10 phút.
        if (requestRepository.countRecentDuplicates(user.getId(), dto.bloodType(), r.getHospitalName(),
                RequestStatus.AWAITING_OR_ACTIVE, now.minus(Duration.ofMinutes(10))) > 0) {
            throw AppException.conflict("DUPLICATE_REQUEST",
                    "Bạn vừa tạo một yêu cầu giống hệt (cùng nhóm máu, cùng cơ sở). Hãy theo dõi yêu cầu đó hoặc hủy nó trước khi tạo lại.");
        }
        r.setIdempotencyKey(key);
        r.setFacilityReview(org == null ? "NONE" : (user.hasRole(Role.ORGANIZATION) ? "CONFIRMED" : "PENDING"));
        r = requestRepository.save(r);
        lifecycle.transition(r, RequestStatus.CREATED, "Đã tạo yêu cầu", user.getId());
        audit.log(user.getId(), AuditAction.REQUEST_CREATED, "REQUEST", r.getId(),
                Map.of("bloodType", dto.bloodType(), "units", dto.unitsRequired(), "urgency", dto.urgency().name()));

        // Tổ chức đã xác minh: yêu cầu được tin cậy ngay và vào điều phối luôn. Còn lại chờ admin xác minh.
        boolean autoVerified = user.hasRole(Role.ORGANIZATION) && org != null;
        lifecycle.transition(r, RequestStatus.PENDING_VERIFICATION, "Đã gửi để xác minh", user.getId());
        if (autoVerified) {
            markVerified(r, user.getId(), "Tự động xác minh: yêu cầu từ tổ chức đã xác minh");
            staffAlerts.notifyNewRequest(r);   // báo đồng nghiệp cùng cơ sở
        } else if ("PENDING".equals(r.getFacilityReview())) {
            // Yêu cầu gắn với cơ sở ĐÃ XÁC MINH: không chờ admin. Huy động ngay, đồng thời báo cơ sở để họ xác nhận hoặc từ chối.
            // Yêu cầu vẫn được đánh dấu "chờ cơ sở xác nhận" và dừng ngay nếu cơ sở từ chối.
            markVerified(r, null, "Tự động huy động: yêu cầu gắn với cơ sở đã xác minh, đang chờ cơ sở xác nhận",
                    "Yêu cầu đã được tiếp nhận",
                    "Yêu cầu " + r.getBloodType().getCode() + " của bạn đã được tiếp nhận, chúng tôi đang tìm người hiến máu và đã báo cho "
                            + r.getHospitalName() + ". Việc có máu hay không do cơ sở y tế quyết định.");
            staffAlerts.notifyNewRequest(r);
        } else {
            // Không gắn cơ sở đã xác minh: yêu cầu đứng chờ admin xác minh, nên báo admin (khẩn cấp thì nêu rõ).
            boolean critical = r.getUrgency() == Urgency.CRITICAL;
            adminAlerts.raise(critical ? "KHẨN: yêu cầu máu chờ xác minh" : "Yêu cầu máu chờ xác minh",
                    "Yêu cầu máu nhóm " + r.getBloodType().getCode() + " tại " + r.getHospitalName() + " đang chờ admin xác minh.",
                    "REQUEST", r.getId());
        }
        return RequestResponse.from(r);
    }

    /** Dùng khi admin xác minh hoặc tổ chức đã xác minh tạo request. Sau đó khởi động matching. */
    @Transactional
    public void markVerified(BloodRequest r, UUID actorId, String note) {
        markVerified(r, actorId, note, "Yêu cầu đã được xác minh",
                "Yêu cầu " + r.getBloodType().getCode() + " của bạn đã được xác minh và chúng tôi đang tìm người hiến máu.");
    }

    @Transactional
    public void markVerified(BloodRequest r, UUID actorId, String note, String title, String message) {
        r.setVerified(true);
        r.setVerifiedBy(actorId);
        lifecycle.transition(r, RequestStatus.VERIFIED, note, actorId);
        notifications.notify(r.getRequesterId(), NotificationType.REQUEST_VERIFIED, title, message,
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

    /** Nhân viên của cơ sở được gắn với yêu cầu xác nhận đây đúng là nhu cầu của cơ sở. */
    @Transactional
    public RequestResponse facilityConfirm(AuthUser user, UUID id) {
        BloodRequest r = lockedForFacility(user, id);
        r.setFacilityReview("CONFIRMED");
        requestRepository.save(r);
        lifecycle.note(r, "Cơ sở y tế đã xác nhận yêu cầu", user.getId());
        notifications.notify(r.getRequesterId(), NotificationType.SYSTEM, "Cơ sở đã xác nhận yêu cầu",
                r.getHospitalName() + " đã xác nhận yêu cầu máu " + r.getBloodType().getCode() + " của bạn.", "REQUEST", r.getId());
        audit.log(user.getId(), "REQUEST_FACILITY_CONFIRMED", "REQUEST", r.getId());
        return RequestResponse.from(r);
    }

    /** Cơ sở từ chối (không phải nhu cầu của cơ sở): dừng huy động, hủy lời mời chưa gửi và báo người đã được mời. */
    @Transactional
    public RequestResponse facilityDeny(AuthUser user, UUID id, String reason) {
        BloodRequest r = lockedForFacility(user, id);
        String clean = Sanitizer.plain(reason);
        r.setFacilityReview("DENIED");
        r.setCancelReason(clean == null ? "Cơ sở y tế không xác nhận yêu cầu này" : clean);
        lifecycle.transition(r, RequestStatus.CANCELLED, "Cơ sở y tế từ chối xác nhận", user.getId());
        matchingService.cancelOpenMatches(r, true);
        notifications.notify(r.getRequesterId(), NotificationType.REQUEST_REJECTED, "Cơ sở không xác nhận yêu cầu",
                r.getHospitalName() + " không xác nhận yêu cầu của bạn: " + r.getCancelReason(), "REQUEST", r.getId());
        audit.log(user.getId(), "REQUEST_FACILITY_DENIED", "REQUEST", r.getId());
        return RequestResponse.from(r);
    }

    private BloodRequest lockedForFacility(AuthUser user, UUID id) {
        BloodRequest r = requestRepository.findByIdForUpdate(id)
                .orElseThrow(() -> AppException.notFound("REQUEST_NOT_FOUND", "Không tìm thấy yêu cầu"));
        boolean mine = r.getOrganizationId() != null && organizationRepository.findForUser(user.getId())
                .map(o -> o.getId().equals(r.getOrganizationId())).orElse(false);
        if (!mine) {
            throw AppException.notFound("REQUEST_NOT_FOUND", "Không tìm thấy yêu cầu");   // chỉ nhân viên đúng cơ sở
        }
        if (!"PENDING".equals(r.getFacilityReview()) || !RequestStatus.CANCELLABLE.contains(r.getStatus())) {
            throw AppException.conflict("INVALID_STATE", "Yêu cầu này không còn ở trạng thái chờ cơ sở xác nhận");
        }
        return r;
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
        // Tài khoản tổ chức (chủ hoặc nhân viên) thấy cả yêu cầu do đồng nghiệp tạo cho cùng tổ chức.
        UUID orgId = user.hasRole(Role.ORGANIZATION)
                ? organizationRepository.findForUser(user.getId()).map(Organization::getId).orElse(null) : null;
        Specification<BloodRequest> spec = (root, q, cb) -> {
            Predicate p = cb.equal(root.get("requesterId"), user.getId());
            if (orgId != null) {
                p = cb.or(p, cb.equal(root.get("organizationId"), orgId));
            }
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
