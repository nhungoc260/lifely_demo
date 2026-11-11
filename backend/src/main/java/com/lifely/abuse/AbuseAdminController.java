package com.lifely.abuse;

import com.lifely.auth.AuthUser;
import com.lifely.common.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@Tag(name = "Abuse monitoring")
@PreAuthorize("hasRole('ADMIN')")
public class AbuseAdminController {

    public record ReviewRequest(@NotNull AbuseAdminService.Decision decision, @Size(max = 500) String note) {
    }

    private final AbuseAdminService service;

    public AbuseAdminController(AbuseAdminService service) {
        this.service = service;
    }

    @GetMapping("/api/admin/abuse-flags")
    public ApiResponse<AbuseAdminService.Overview> list(@RequestParam(defaultValue = "OPEN") String status) {
        return ApiResponse.ok("OK", service.overview(status));
    }

    @PostMapping("/api/admin/abuse-flags/{id}/review")
    public ApiResponse<AbuseAdminService.FlagRow> review(@AuthenticationPrincipal AuthUser admin, @PathVariable UUID id,
                                                         @Valid @RequestBody ReviewRequest req) {
        return ApiResponse.ok("Đã xử lý cờ", service.review(admin, id, req.decision(), req.note()));
    }
}
