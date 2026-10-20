package com.lifely.admin;

import com.lifely.admin.dto.AdminUserOverview;
import com.lifely.auth.AuthUser;
import com.lifely.common.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/users")
@Tag(name = "Admin")
public class AdminUserOverviewController {

    private final AdminUserOverviewService service;

    public AdminUserOverviewController(AdminUserOverviewService service) {
        this.service = service;
    }

    @GetMapping("/{id}/overview")
    @PreAuthorize("hasRole('ADMIN')")
    public ApiResponse<AdminUserOverview> overview(@AuthenticationPrincipal AuthUser admin, @PathVariable UUID id) {
        return ApiResponse.ok("OK", service.overview(admin.getId(), id));
    }
}
