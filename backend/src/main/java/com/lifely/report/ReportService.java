package com.lifely.report;

import com.lifely.audit.AuditAction;
import com.lifely.admin.AdminAlerts;
import com.lifely.audit.AuditService;
import com.lifely.auth.AuthUser;
import com.lifely.common.AppException;
import com.lifely.common.Sanitizer;
import com.lifely.organization.OrganizationRepository;
import com.lifely.request.BloodRequestRepository;
import com.lifely.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.Map;

@Service
public class ReportService {

    private final ReportRepository repository;
    private final BloodRequestRepository requestRepository;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final AuditService audit;
    private final AdminAlerts adminAlerts;

    public ReportService(ReportRepository repository, BloodRequestRepository requestRepository,
                         UserRepository userRepository, OrganizationRepository organizationRepository,
                         AuditService audit, AdminAlerts adminAlerts) {
        this.repository = repository;
        this.requestRepository = requestRepository;
        this.userRepository = userRepository;
        this.organizationRepository = organizationRepository;
        this.audit = audit;
        this.adminAlerts = adminAlerts;
    }

    @Transactional
    public ReportDto create(AuthUser user, CreateReportRequest req) {
        boolean exists = switch (req.targetType()) {
            case REQUEST -> requestRepository.existsById(req.targetId());
            case USER -> userRepository.existsById(req.targetId());
            case ORGANIZATION -> organizationRepository.existsById(req.targetId());
        };
        if (!exists) {
            throw AppException.notFound("TARGET_NOT_FOUND", "Nội dung bạn báo cáo không còn tồn tại");
        }
        if (repository.existsByReporterIdAndTargetTypeAndTargetIdAndStatusIn(user.getId(), req.targetType(),
                req.targetId(), EnumSet.of(ReportStatus.OPEN, ReportStatus.INVESTIGATING))) {
            throw AppException.conflict("ALREADY_REPORTED", "Bạn đã báo cáo nội dung này rồi");
        }
        Report r = new Report();
        r.setReporterId(user.getId());
        r.setTargetType(req.targetType());
        r.setTargetId(req.targetId());
        r.setReason(req.reason());
        r.setDescription(Sanitizer.plain(req.description()));
        r = repository.save(r);
        audit.log(user.getId(), AuditAction.REPORT_CREATED, "REPORT", r.getId(),
                Map.of("targetType", req.targetType().name(), "reason", req.reason().name()));
        String target = switch (req.targetType()) {
            case REQUEST -> "một yêu cầu máu";
            case USER -> "một người dùng";
            case ORGANIZATION -> "một tổ chức";
        };
        String reason = switch (req.reason()) {
            case FAKE_REQUEST -> "yêu cầu giả";
            case SPAM -> "spam";
            case INCORRECT_INFORMATION -> "thông tin sai";
            case ABUSE -> "lạm dụng";
            case OTHER -> "lý do khác";
        };
        adminAlerts.raise("Báo cáo vi phạm mới", "Có người báo cáo " + target + " (" + reason + "). Vào Báo cáo vi phạm để xử lý.",
                "REPORT", r.getId());
        return ReportDto.from(r);
    }
}
