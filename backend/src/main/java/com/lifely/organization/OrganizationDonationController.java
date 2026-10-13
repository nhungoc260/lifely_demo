package com.lifely.organization;

import com.lifely.auth.AuthUser;
import com.lifely.common.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/organizations/me/donations")
@Tag(name = "Organization")
public class OrganizationDonationController {

    private final OrganizationDonationService service;

    public OrganizationDonationController(OrganizationDonationService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasRole('ORGANIZATION')")
    public ApiResponse<List<DonationLogEntry>> list(@AuthenticationPrincipal AuthUser user) {
        return ApiResponse.ok("OK", service.list(user.getId()));
    }
}
