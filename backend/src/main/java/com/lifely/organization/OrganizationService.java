package com.lifely.organization;

import com.lifely.audit.AuditService;
import com.lifely.auth.AuthUser;
import com.lifely.common.AppException;
import com.lifely.common.PageResponse;
import com.lifely.common.Sanitizer;
import com.lifely.organization.dto.*;
import com.lifely.request.*;
import com.lifely.request.dto.RequestResponse;
import jakarta.persistence.criteria.Predicate;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class OrganizationService {

    private final OrganizationRepository repository;
    private final OrganizationDocumentRepository documentRepository;
    private final FileStorageService storage;
    private final BloodRequestRepository requestRepository;
    private final RequestService requestService;
    private final JdbcTemplate jdbc;

    public OrganizationService(OrganizationRepository repository, OrganizationDocumentRepository documentRepository,
                               FileStorageService storage, BloodRequestRepository requestRepository,
                               RequestService requestService, JdbcTemplate jdbc) {
        this.repository = repository;
        this.documentRepository = documentRepository;
        this.storage = storage;
        this.requestRepository = requestRepository;
        this.requestService = requestService;
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public OrganizationDto getMine(UUID userId) {
        return repository.findByOwnerUserId(userId).map(this::toDto).orElse(null);
    }

    /** Tạo hoặc cập nhật hồ sơ. Đổi tên/địa chỉ/vị trí của tổ chức đã xác minh sẽ phải xác minh lại. */
    @Transactional
    public OrganizationDto upsert(UUID userId, UpdateOrganizationRequest req) {
        Organization o = repository.findByOwnerUserId(userId).orElseGet(() -> {
            Organization n = new Organization();
            n.setOwnerUserId(userId);
            return n;
        });
        BigDecimal lat = BigDecimal.valueOf(req.latitude()).setScale(6, RoundingMode.HALF_UP);
        BigDecimal lng = BigDecimal.valueOf(req.longitude()).setScale(6, RoundingMode.HALF_UP);
        String name = Sanitizer.plain(req.name());
        String address = Sanitizer.plain(req.address());
        boolean sensitiveChange = o.getId() != null && o.isVerified()
                && (!name.equals(o.getName()) || !address.equals(o.getAddress())
                || lat.compareTo(o.getLatitude()) != 0 || lng.compareTo(o.getLongitude()) != 0);

        o.setName(name);
        o.setType(req.type());
        o.setAddress(address);
        o.setCity(Sanitizer.plain(req.city()));
        o.setDistrict(Sanitizer.plain(req.district()));
        o.setLatitude(lat);
        o.setLongitude(lng);
        o.setPhone(req.phone());
        o.setEmail(req.email().trim().toLowerCase());
        o.setContactPerson(Sanitizer.plain(req.contactPerson()));
        if (sensitiveChange) {
            o.setVerificationStatus(OrgVerificationStatus.UNDER_REVIEW);
            o.setVerificationNote("Thông tin đã thay đổi; cần xác minh lại");
        }
        return toDto(repository.save(o));
    }

    @Transactional
    public OrganizationDto addDocument(UUID userId, String docType, MultipartFile file) {
        Organization o = mine(userId);
        if (documentRepository.countByOrganizationId(o.getId()) >= 10) {
            throw AppException.badRequest("TOO_MANY_DOCUMENTS", "Bạn có thể tải lên tối đa 10 giấy tờ");
        }
        FileStorageService.Stored stored = storage.store(file);
        OrganizationDocument d = new OrganizationDocument();
        d.setOrganizationId(o.getId());
        d.setDocType(Sanitizer.plain(docType) == null ? "OTHER" : Sanitizer.plain(docType));
        String original = file.getOriginalFilename() == null ? "document" : file.getOriginalFilename();
        d.setFileName(Sanitizer.plain(original.replaceAll("[\\\\/]", "_")));
        d.setFileUrl(stored.storedName());
        documentRepository.save(d);
        return toDto(o);
    }

    @Transactional
    public OrganizationDto submitForReview(UUID userId) {
        Organization o = mine(userId);
        if (o.getVerificationStatus() != OrgVerificationStatus.PENDING
                && o.getVerificationStatus() != OrgVerificationStatus.REJECTED) {
            throw AppException.conflict("INVALID_STATE", "Tổ chức này đang được xem xét hoặc đã được xác minh");
        }
        if (documentRepository.countByOrganizationId(o.getId()) == 0) {
            throw AppException.badRequest("DOCUMENT_REQUIRED", "Hãy tải lên ít nhất một giấy tờ xác minh trước");
        }
        o.setVerificationStatus(OrgVerificationStatus.UNDER_REVIEW);
        o.setVerificationNote(null);
        return toDto(repository.save(o));
    }

    public record DocumentFile(Resource resource, String fileName, String contentType) {
    }

    /** Chủ tổ chức hoặc admin mới tải được tài liệu. */
    @Transactional(readOnly = true)
    public DocumentFile download(AuthUser user, UUID documentId) {
        OrganizationDocument d = documentRepository.findById(documentId)
                .orElseThrow(() -> AppException.notFound("DOCUMENT_NOT_FOUND", "Không tìm thấy giấy tờ"));
        Organization o = repository.findById(d.getOrganizationId())
                .orElseThrow(() -> AppException.notFound("DOCUMENT_NOT_FOUND", "Không tìm thấy giấy tờ"));
        if (!user.hasRole(com.lifely.user.Role.ADMIN) && !o.getOwnerUserId().equals(user.getId())) {
            throw AppException.notFound("DOCUMENT_NOT_FOUND", "Không tìm thấy giấy tờ");
        }
        return new DocumentFile(storage.load(d.getFileUrl()), d.getFileName(), storage.contentTypeOf(d.getFileUrl()));
    }

    @Transactional(readOnly = true)
    public OrganizationDashboard dashboard(UUID userId) {
        Organization o = mine(userId);
        String scope = "(r.requester_id = ? OR r.organization_id = ?)";
        Object[] args = {userId, o.getId()};
        long active = count("SELECT count(*) FROM blood_requests r WHERE " + scope
                + " AND r.status IN ('VERIFIED','MATCHING','DONORS_CONTACTED','PARTIALLY_FULFILLED')", args);
        long critical = count("SELECT count(*) FROM blood_requests r WHERE " + scope
                + " AND r.urgency='CRITICAL' AND r.status IN ('VERIFIED','MATCHING','DONORS_CONTACTED','PARTIALLY_FULFILLED')", args);
        long completed = count("SELECT count(*) FROM blood_requests r WHERE " + scope + " AND r.status='FULFILLED'", args);
        long contacted = count("SELECT count(*) FROM matches m JOIN blood_requests r ON r.id=m.request_id WHERE "
                + scope + " AND m.status <> 'PENDING'", args);
        long responded = count("SELECT count(*) FROM matches m JOIN blood_requests r ON r.id=m.request_id WHERE "
                + scope + " AND m.status IN ('ACCEPTED','REJECTED','COMPLETED')", args);
        double rate = contacted == 0 ? 0 : Math.round(responded * 1000.0 / contacted) / 10.0;
        return new OrganizationDashboard(o.getVerificationStatus(), active, critical, completed, rate);
    }

    @Transactional(readOnly = true)
    public PageResponse<RequestResponse> listRequests(UUID userId, RequestStatus status, int page, int size) {
        Organization o = mine(userId);
        Specification<BloodRequest> spec = (root, q, cb) -> {
            Predicate scope = cb.or(cb.equal(root.get("requesterId"), userId),
                    cb.equal(root.get("organizationId"), o.getId()));
            return status == null ? scope : cb.and(scope, cb.equal(root.get("status"), status));
        };
        Page<BloodRequest> result = requestRepository.findAll(spec,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50), Sort.by("createdAt").descending()));
        return PageResponse.of(result, RequestResponse::from);
    }

    /** Tổ chức đã xác minh xác nhận một yêu cầu gắn với bệnh viện của mình (bệnh nhân có thật tại cơ sở). */
    @Transactional
    public RequestResponse verifyLinkedRequest(UUID userId, UUID requestId) {
        Organization o = mine(userId);
        if (!o.isVerified()) {
            throw AppException.forbidden("ORGANIZATION_NOT_VERIFIED", "Tổ chức của bạn cần được xác minh trước");
        }
        BloodRequest r = requestRepository.findByIdForUpdate(requestId)
                .orElseThrow(() -> AppException.notFound("REQUEST_NOT_FOUND", "Không tìm thấy yêu cầu"));
        if (!o.getId().equals(r.getOrganizationId())) {
            throw AppException.notFound("REQUEST_NOT_FOUND", "Không tìm thấy yêu cầu");
        }
        if (r.getStatus() != RequestStatus.PENDING_VERIFICATION) {
            throw AppException.conflict("INVALID_STATE", "Chỉ yêu cầu đang chờ xác minh mới được xác minh");
        }
        if (r.getDeadline().isBefore(Instant.now())) {
            throw AppException.conflict("REQUEST_EXPIRED", "Yêu cầu này đã quá hạn");
        }
        requestService.markVerified(r, userId, "Đã xác minh bởi " + o.getName());
        return RequestResponse.from(r);
    }

    private long count(String sql, Object[] args) {
        Long v = jdbc.queryForObject(sql, Long.class, args);
        return v == null ? 0 : v;
    }

    private Organization mine(UUID userId) {
        return repository.findByOwnerUserId(userId)
                .orElseThrow(() -> AppException.notFound("ORGANIZATION_NOT_FOUND",
                        "Hãy hoàn tất hồ sơ tổ chức trước"));
    }

    private OrganizationDto toDto(Organization o) {
        return OrganizationDto.from(o, documentRepository.findByOrganizationIdOrderByUploadedAtDesc(o.getId()));
    }

    public List<Organization> verified() {
        return repository.findByVerificationStatusOrderByNameAsc(OrgVerificationStatus.VERIFIED);
    }
}
