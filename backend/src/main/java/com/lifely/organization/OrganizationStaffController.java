package com.lifely.organization;

import com.lifely.auth.AuthUser;
import com.lifely.common.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/organizations/me/staff")
@Tag(name = "Organization")
public class OrganizationStaffController {

    private final OrganizationStaffService service;

    public OrganizationStaffController(OrganizationStaffService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasRole('ORGANIZATION')")
    public ApiResponse<StaffOverview> list(@AuthenticationPrincipal AuthUser user) {
        return ApiResponse.ok("OK", service.list(user.getId()));
    }

    @PostMapping
    @PreAuthorize("hasRole('ORGANIZATION')")
    public ApiResponse<StaffOverview> add(@AuthenticationPrincipal AuthUser user, @Valid @RequestBody AddStaffRequest req) {
        return ApiResponse.ok("Đã thêm nhân viên", service.add(user.getId(), req.email()));
    }

    @DeleteMapping("/{staffId}")
    @PreAuthorize("hasRole('ORGANIZATION')")
    public ApiResponse<StaffOverview> remove(@AuthenticationPrincipal AuthUser user, @PathVariable UUID staffId) {
        return ApiResponse.ok("Đã gỡ nhân viên", service.remove(user.getId(), staffId));
    }
}
