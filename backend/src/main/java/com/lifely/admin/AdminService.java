package com.lifely.admin;

import com.lifely.admin.dto.*;
import com.lifely.audit.*;
import com.lifely.auth.AuthUser;
import com.lifely.common.AppException;
import com.lifely.common.PageResponse;
import com.lifely.common.Sanitizer;
import com.lifely.matching.MatchRepository;
import com.lifely.notification.NotificationService;
import com.lifely.notification.NotificationType;
import com.lifely.organization.*;
import com.lifely.organization.dto.OrganizationDto;
import com.lifely.report.*;
import com.lifely.request.*;
import com.lifely.request.dto.RequestResponse;
import com.lifely.user.*;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
public class AdminService {

    private static final Set<String> USER_SORTS = Set.of("createdAt", "fullName", "email", "status");
    private static final Set<String> REQUEST_SORTS = Set.of("createdAt", "deadline", "urgency", "status", "unitsRequired");

    private final UserRepository userRepository;
    private final BloodRequestRepository requestRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationDocumentRepository documentRepository;
    private final ReportRepository reportRepository;
    private final AuditLogRepository auditRepository;
    private final RequestService requestService;
    private final NotificationService notifications;
    private final AuditService audit;

    public AdminService(UserRepository userRepository, BloodRequestRepository requestRepository,
                        OrganizationRepository organizationRepository,
                        OrganizationDocumentRepository documentRepository, ReportRepository reportRepository,
                        AuditLogRepository auditRepository, RequestService requestService,
                        NotificationService notifications, AuditService audit) {
        this.userRepository = userRepository;
        this.requestRepository = requestRepository;
        this.organizationRepository = organizationRepository;
        this.documentRepository = documentRepository;
        this.reportRepository = reportRepository;
        this.auditRepository = auditRepository;
        this.requestService = requestService;
        this.notifications = notifications;
        this.audit = audit;
    }

    private static PageRequest page(int page, int size, String sort, String dir, Set<String> allowed, String fallback) {
        String field = allowed.contains(sort) ? sort : fallback;
        Sort s = "asc".equalsIgnoreCase(dir) ? Sort.by(field).ascending() : Sort.by(field).descending();
        return PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100), s);
    }

    // ------------------------------------------------------------------ users

    @Transactional(readOnly = true)
    public PageResponse<AdminUserDto> users(String q, String role, UserStatus status, int page, int size,
                                            String sort, String dir) {
        Specification<User> spec = (root, query, cb) -> {
            query.distinct(true);
            List<Predicate> ps = new ArrayList<>();
            if (q != null && !q.isBlank()) {
                String like = "%" + q.trim().toLowerCase() + "%";
                ps.add(cb.or(cb.like(cb.lower(root.get("fullName")), like), cb.like(cb.lower(root.get("email")), like)));
            }
            if (role != null && !role.isBlank()) {
                Join<User, Role> r = root.join("roles");
                ps.add(cb.equal(r.get("name"), "ROLE_" + role.toUpperCase()));
            }
            if (status != null) ps.add(cb.equal(root.get("status"), status));
            return cb.and(ps.toArray(new Predicate[0]));
        };
        Page<User> result = userRepository.findAll(spec, page(page, size, sort, dir, USER_SORTS, "createdAt"));
        return PageResponse.of(result, AdminUserDto::from);
    }

    @Transactional(readOnly = true)
    public AdminUserDto user(UUID id) {
        return AdminUserDto.from(userRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("USER_NOT_FOUND", "Không tìm thấy người dùng")));
    }

    @Transactional
    public AdminUserDto setUserStatus(AuthUser admin, UUID id, UserStatus status) {
        User u = userRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("USER_NOT_FOUND", "Không tìm thấy người dùng"));
        if (u.getId().equals(admin.getId())) {
            throw AppException.badRequest("CANNOT_MODIFY_SELF", "Bạn không thể tự đổi trạng thái tài khoản của mình");
        }
        if (u.hasRole(Role.ADMIN)) {
            throw AppException.forbidden("CANNOT_MODIFY_ADMIN", "Không thể khóa tài khoản admin tại đây");
        }
        u.setStatus(status);
        userRepository.save(u);
        audit.log(admin.getId(), status == UserStatus.SUSPENDED ? AuditAction.USER_SUSPENDED : AuditAction.USER_ACTIVATED,
                "USER", u.getId());
        return AdminUserDto.from(u);
    }

    // ------------------------------------------------------------------ requests

    @Transactional(readOnly = true)
    public PageResponse<AdminRequestRow> requests(Urgency urgency, String bloodType, RequestStatus status,
                                                  UUID organizationId, String city, Instant from, Instant to,
                                                  int page, int size, String sort, String dir) {
        Specification<BloodRequest> spec = (root, q, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            if (urgency != null) ps.add(cb.equal(root.get("urgency"), urgency));
            if (bloodType != null && !bloodType.isBlank()) ps.add(cb.equal(root.get("bloodType").get("code"), bloodType));
            if (status != null) ps.add(cb.equal(root.get("status"), status));
            if (organizationId != null) ps.add(cb.equal(root.get("organizationId"), organizationId));
            if (city != null && !city.isBlank()) ps.add(cb.like(cb.lower(root.get("city")), "%" + city.trim().toLowerCase() + "%"));
            if (from != null) ps.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
            if (to != null) ps.add(cb.lessThanOrEqualTo(root.get("createdAt"), to));
            return cb.and(ps.toArray(new Predicate[0]));
        };
        Page<BloodRequest> result = requestRepository.findAll(spec, page(page, size, sort, dir, REQUEST_SORTS, "createdAt"));
        return PageResponse.of(result, this::row);
    }

    @Transactional(readOnly = true)
    public AdminRequestRow request(UUID id) {
        return row(requestRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("REQUEST_NOT_FOUND", "Không tìm thấy yêu cầu")));
    }

    private AdminRequestRow row(BloodRequest r) {
        User u = userRepository.findById(r.getRequesterId()).orElse(null);
        return new AdminRequestRow(RequestResponse.from(r), u == null ? null : u.getFullName(),
                u == null ? null : u.getEmail());
    }

    // ------------------------------------------------------------------ organizations

    @Transactional(readOnly = true)
    public PageResponse<OrganizationDto> organizations(OrgVerificationStatus status, String q, int page, int size) {
        Specification<Organization> spec = (root, query, cb) -> {
            List<Predicate> ps = new ArrayList<>();
            if (status != null) ps.add(cb.equal(root.get("verificationStatus"), status));
            if (q != null && !q.isBlank()) ps.add(cb.like(cb.lower(root.get("name")), "%" + q.trim().toLowerCase() + "%"));
            return cb.and(ps.toArray(new Predicate[0]));
        };
        Page<Organization> result = organizationRepository.findAll(spec,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100), Sort.by("createdAt").descending()));
        return PageResponse.of(result, o -> OrganizationDto.from(o, documentRepository.findByOrganizationIdOrderByUploadedAtDesc(o.getId())));
    }

    @Transactional(readOnly = true)
    public OrganizationDto organization(UUID id) {
        Organization o = organizationRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("ORGANIZATION_NOT_FOUND", "Không tìm thấy tổ chức"));
        return OrganizationDto.from(o, documentRepository.findByOrganizationIdOrderByUploadedAtDesc(id));
    }

    @Transactional
    public OrganizationDto reviewOrganization(AuthUser admin, UUID id, OrgVerificationStatus target, String note) {
        Organization o = organizationRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("ORGANIZATION_NOT_FOUND", "Không tìm thấy tổ chức"));
        String clean = Sanitizer.plain(note);
        if (target == OrgVerificationStatus.REJECTED && clean == null) {
            throw AppException.badRequest("NOTE_REQUIRED", "Vui lòng nêu lý do để tổ chức có thể khắc phục");
        }
        if (target == OrgVerificationStatus.VERIFIED && documentRepository.countByOrganizationId(id) == 0) {
            throw AppException.badRequest("DOCUMENT_REQUIRED", "Tổ chức này chưa tải giấy tờ nào lên");
        }
        o.setVerificationStatus(target);
        o.setVerificationNote(clean);
        if (target == OrgVerificationStatus.VERIFIED) {
            o.setVerifiedBy(admin.getId());
            o.setVerifiedAt(Instant.now());
        }
        organizationRepository.save(o);
        String action = switch (target) {
            case VERIFIED -> AuditAction.ORGANIZATION_VERIFIED;
            case REJECTED -> AuditAction.ORGANIZATION_REJECTED;
            default -> AuditAction.ORGANIZATION_SUSPENDED;
        };
        audit.log(admin.getId(), action, "ORGANIZATION", o.getId());
        String statusText = switch (target) {
            case VERIFIED -> "đã được xác minh";
            case REJECTED -> "bị từ chối";
            case SUSPENDED -> "bị tạm khóa";
            default -> target.name();
        };
        notifications.notify(o.getOwnerUserId(), NotificationType.SYSTEM, "Tổ chức " + statusText,
                clean == null ? "Trạng thái tổ chức của bạn: " + statusText + "." : clean, "ORGANIZATION", o.getId());
        return OrganizationDto.from(o, documentRepository.findByOrganizationIdOrderByUploadedAtDesc(id));
    }

    // ------------------------------------------------------------------ reports & audit

    @Transactional(readOnly = true)
    public PageResponse<ReportDto> reports(ReportStatus status, int page, int size) {
        Specification<Report> spec = (root, q, cb) -> status == null ? cb.conjunction() : cb.equal(root.get("status"), status);
        Page<Report> result = reportRepository.findAll(spec,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100), Sort.by("createdAt").descending()));
        return PageResponse.of(result, ReportDto::from);
    }

    @Transactional
    public ReportDto updateReport(AuthUser admin, UUID id, ReportStatus status) {
        Report r = reportRepository.findById(id)
                .orElseThrow(() -> AppException.notFound("REPORT_NOT_FOUND", "Không tìm thấy báo cáo"));
        r.setStatus(status);
        if (status == ReportStatus.RESOLVED || status == ReportStatus.REJECTED) {
            r.setResolvedBy(admin.getId());
            r.setResolvedAt(Instant.now());
        }
        reportRepository.save(r);
        audit.log(admin.getId(), AuditAction.REPORT_UPDATED, "REPORT", r.getId(), Map.of("status", status.name()));
        return ReportDto.from(r);
    }

    @Transactional(readOnly = true)
    public PageResponse<AuditLogDto> auditLogs(String action, int page, int size) {
        Specification<AuditLog> spec = (root, q, cb) ->
                action == null || action.isBlank() ? cb.conjunction() : cb.equal(root.get("action"), action);
        Page<AuditLog> result = auditRepository.findAll(spec,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100), Sort.by("createdAt").descending()));
        return PageResponse.of(result, AuditLogDto::from);
    }

    // verify/reject/cancel của request dùng lại RequestService để có đầy đủ transaction, lịch sử và thông báo
    @Transactional(readOnly = true)
    public java.util.List<com.lifely.request.dto.HistoryEntry> requestHistory(AuthUser admin, UUID id) {
        return requestService.history(admin, id);
    }

    public RequestResponse verifyRequest(AuthUser admin, UUID id) {
        return requestService.verifyByAdmin(admin, id);
    }

    public RequestResponse rejectRequest(AuthUser admin, UUID id, String reason) {
        return requestService.rejectByAdmin(admin, id, reason);
    }

    public RequestResponse cancelRequest(AuthUser admin, UUID id, String reason) {
        return requestService.cancel(admin, id, reason);
    }
}
