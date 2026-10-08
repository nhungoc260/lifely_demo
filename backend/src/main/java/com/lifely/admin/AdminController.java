package com.lifely.admin;

import com.lifely.admin.dto.*;
import com.lifely.auth.AuthUser;
import com.lifely.common.ApiResponse;
import com.lifely.common.PageResponse;
import com.lifely.organization.OrgVerificationStatus;
import com.lifely.organization.dto.OrganizationDto;
import com.lifely.report.ReportDto;
import com.lifely.report.ReportStatus;
import com.lifely.request.RequestStatus;
import com.lifely.request.Urgency;
import com.lifely.request.dto.RequestResponse;
import com.lifely.user.UserStatus;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin")
public class AdminController {

    private final AdminService service;
    private final AdminStatsService stats;

    public AdminController(AdminService service, AdminStatsService stats) {
        this.service = service;
        this.stats = stats;
    }

    @GetMapping("/dashboard")
    public ApiResponse<Map<String, Object>> dashboard() {
        return ApiResponse.ok("OK", stats.dashboard());
    }

    // ---- users
    @GetMapping("/users")
    public ApiResponse<PageResponse<AdminUserDto>> users(@RequestParam(required = false) String q,
                                                         @RequestParam(required = false) String role,
                                                         @RequestParam(required = false) UserStatus status,
                                                         @RequestParam(defaultValue = "0") int page,
                                                         @RequestParam(defaultValue = "20") int size,
                                                         @RequestParam(defaultValue = "createdAt") String sort,
                                                         @RequestParam(defaultValue = "desc") String dir) {
        return ApiResponse.ok("OK", service.users(q, role, status, page, size, sort, dir));
    }

    @GetMapping("/users/{id}")
    public ApiResponse<AdminUserDto> user(@PathVariable UUID id) {
        return ApiResponse.ok("OK", service.user(id));
    }

    @PostMapping("/users/{id}/suspend")
    public ApiResponse<AdminUserDto> suspend(@AuthenticationPrincipal AuthUser admin, @PathVariable UUID id) {
        return ApiResponse.ok("Đã khóa người dùng", service.setUserStatus(admin, id, UserStatus.SUSPENDED));
    }

    @PostMapping("/users/{id}/activate")
    public ApiResponse<AdminUserDto> activate(@AuthenticationPrincipal AuthUser admin, @PathVariable UUID id) {
        return ApiResponse.ok("Đã kích hoạt người dùng", service.setUserStatus(admin, id, UserStatus.ACTIVE));
    }

    // ---- requests
    @GetMapping("/requests")
    public ApiResponse<PageResponse<AdminRequestRow>> requests(
            @RequestParam(required = false) Urgency urgency, @RequestParam(required = false) String bloodType,
            @RequestParam(required = false) RequestStatus status, @RequestParam(required = false) UUID organizationId,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sort, @RequestParam(defaultValue = "desc") String dir) {
        return ApiResponse.ok("OK", service.requests(urgency, bloodType, status, organizationId, city, from, to,
                page, size, sort, dir));
    }

    @GetMapping("/requests/{id}")
    public ApiResponse<AdminRequestRow> request(@PathVariable UUID id) {
        return ApiResponse.ok("OK", service.request(id));
    }

    @GetMapping("/requests/{id}/history")
    public ApiResponse<java.util.List<com.lifely.request.dto.HistoryEntry>> requestHistory(
            @AuthenticationPrincipal AuthUser admin, @PathVariable UUID id) {
        return ApiResponse.ok("OK", service.requestHistory(admin, id));
    }

    @PostMapping("/requests/{id}/verify")
    public ApiResponse<RequestResponse> verifyRequest(@AuthenticationPrincipal AuthUser admin, @PathVariable UUID id) {
        return ApiResponse.ok("Đã xác minh yêu cầu. Hệ thống bắt đầu tìm người hiến máu", service.verifyRequest(admin, id));
    }

    @PostMapping("/requests/{id}/reject")
    public ApiResponse<RequestResponse> rejectRequest(@AuthenticationPrincipal AuthUser admin, @PathVariable UUID id,
                                                      @Valid @RequestBody(required = false) ReviewNote body) {
        return ApiResponse.ok("Đã từ chối yêu cầu", service.rejectRequest(admin, id, body == null ? null : body.note()));
    }

    @PostMapping("/requests/{id}/cancel")
    public ApiResponse<RequestResponse> cancelRequest(@AuthenticationPrincipal AuthUser admin, @PathVariable UUID id,
                                                      @Valid @RequestBody(required = false) ReviewNote body) {
        return ApiResponse.ok("Yêu cầu đã bị hủy", service.cancelRequest(admin, id, body == null ? null : body.note()));
    }

    // ---- organizations
    @GetMapping("/organizations")
    public ApiResponse<PageResponse<OrganizationDto>> organizations(
            @RequestParam(required = false) OrgVerificationStatus status, @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok("OK", service.organizations(status, q, page, size));
    }

    @GetMapping("/organizations/{id}")
    public ApiResponse<OrganizationDto> organization(@PathVariable UUID id) {
        return ApiResponse.ok("OK", service.organization(id));
    }

    @PostMapping("/organizations/{id}/verify")
    public ApiResponse<OrganizationDto> verifyOrg(@AuthenticationPrincipal AuthUser admin, @PathVariable UUID id,
                                                  @Valid @RequestBody(required = false) ReviewNote body) {
        return ApiResponse.ok("Đã xác minh tổ chức",
                service.reviewOrganization(admin, id, OrgVerificationStatus.VERIFIED, body == null ? null : body.note()));
    }

    @PostMapping("/organizations/{id}/reject")
    public ApiResponse<OrganizationDto> rejectOrg(@AuthenticationPrincipal AuthUser admin, @PathVariable UUID id,
                                                  @Valid @RequestBody(required = false) ReviewNote body) {
        return ApiResponse.ok("Đã từ chối tổ chức",
                service.reviewOrganization(admin, id, OrgVerificationStatus.REJECTED, body == null ? null : body.note()));
    }

    @PostMapping("/organizations/{id}/suspend")
    public ApiResponse<OrganizationDto> suspendOrg(@AuthenticationPrincipal AuthUser admin, @PathVariable UUID id,
                                                   @Valid @RequestBody(required = false) ReviewNote body) {
        return ApiResponse.ok("Đã tạm khóa tổ chức",
                service.reviewOrganization(admin, id, OrgVerificationStatus.SUSPENDED, body == null ? null : body.note()));
    }

    // ---- reports & audit
    @GetMapping("/reports")
    public ApiResponse<PageResponse<ReportDto>> reports(@RequestParam(required = false) ReportStatus status,
                                                        @RequestParam(defaultValue = "0") int page,
                                                        @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok("OK", service.reports(status, page, size));
    }

    @PutMapping("/reports/{id}")
    public ApiResponse<ReportDto> updateReport(@AuthenticationPrincipal AuthUser admin, @PathVariable UUID id,
                                               @Valid @RequestBody UpdateReportRequest req) {
        return ApiResponse.ok("Đã cập nhật báo cáo", service.updateReport(admin, id, req.status()));
    }

    @GetMapping("/audit-logs")
    public ApiResponse<PageResponse<AuditLogDto>> auditLogs(@RequestParam(required = false) String action,
                                                            @RequestParam(defaultValue = "0") int page,
                                                            @RequestParam(defaultValue = "30") int size) {
        return ApiResponse.ok("OK", service.auditLogs(action, page, size));
    }
}
