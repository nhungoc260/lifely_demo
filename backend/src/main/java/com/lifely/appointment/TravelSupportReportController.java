package com.lifely.appointment;

import com.lifely.auth.AuthUser;
import com.lifely.common.ApiResponse;
import com.lifely.common.AppException;
import com.lifely.organization.Organization;
import com.lifely.organization.OrganizationRepository;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@Tag(name = "Travel support report")
public class TravelSupportReportController {

    private final TravelSupportReportService service;
    private final OrganizationRepository organizations;

    public TravelSupportReportController(TravelSupportReportService service, OrganizationRepository organizations) {
        this.service = service;
        this.organizations = organizations;
    }

    @GetMapping("/api/admin/travel-support")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<TravelSupportReportService.Report> report() {
        return ApiResponse.ok("OK", service.report());
    }

    /** Admin: danh sách lượt hiến đã xác nhận (đã hoặc chưa ghi nhận hỗ trợ), lọc theo cơ sở nếu cần. */
    @GetMapping("/api/admin/travel-support/items")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<List<TravelSupportReportService.Item>> adminItems(@RequestParam(defaultValue = "UNPAID") String status,
                                                                         @RequestParam(required = false) UUID organizationId) {
        return ApiResponse.ok("OK", service.items(organizationId, status));
    }

    /** Cơ sở: các lượt hiến cần ghi nhận hỗ trợ (lịch hiến và yêu cầu khẩn cấp). */
    @GetMapping("/api/organizations/me/travel-support/items")
    @PreAuthorize("hasRole('ORGANIZATION')")
    public ApiResponse<List<TravelSupportReportService.Item>> myItems(@AuthenticationPrincipal AuthUser user,
                                                                      @RequestParam(defaultValue = "UNPAID") String status) {
        Organization org = organizations.findForUser(user.getId())
                .orElseThrow(() -> AppException.notFound("ORG_NOT_FOUND", "Chưa có hồ sơ tổ chức"));
        return ApiResponse.ok("OK", service.items(org.getId(), status));
    }

    /** Thống kê hỗ trợ đi lại của chính cơ sở đang đăng nhập (chủ hoặc nhân viên). */
    @GetMapping("/api/organizations/me/travel-support")
    @PreAuthorize("hasRole('ORGANIZATION')")
    public ApiResponse<TravelSupportReportService.OrgReport> mine(@AuthenticationPrincipal AuthUser user) {
        Organization org = organizations.findForUser(user.getId())
                .orElseThrow(() -> AppException.notFound("ORG_NOT_FOUND", "Chưa có hồ sơ tổ chức"));
        return ApiResponse.ok("OK", service.forOrganization(org.getId()));
    }
}
