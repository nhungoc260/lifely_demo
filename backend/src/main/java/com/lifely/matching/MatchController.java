package com.lifely.matching;

import com.lifely.auth.AuthUser;
import com.lifely.common.ApiResponse;
import com.lifely.matching.dto.DonorMatchResponse;
import com.lifely.matching.dto.RequestMatchEntry;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@Tag(name = "Matching")
public class MatchController {

    private final MatchService service;

    public MatchController(MatchService service) {
        this.service = service;
    }

    @GetMapping("/api/donors/me/matches")
    @PreAuthorize("hasRole('DONOR')")
    public ApiResponse<List<DonorMatchResponse>> myMatches(@AuthenticationPrincipal AuthUser user,
                                                           @RequestParam(required = false) MatchStatus status) {
        return ApiResponse.ok("OK", service.listForDonor(user, status));
    }

    @GetMapping("/api/matches/{id}")
    @PreAuthorize("hasRole('DONOR')")
    public ApiResponse<DonorMatchResponse> detail(@AuthenticationPrincipal AuthUser user, @PathVariable UUID id) {
        return ApiResponse.ok("OK", service.detailForDonor(user, id));
    }

    @PostMapping("/api/matches/{id}/accept")
    @PreAuthorize("hasRole('DONOR')")
    public ApiResponse<DonorMatchResponse> accept(@AuthenticationPrincipal AuthUser user, @PathVariable UUID id) {
        return ApiResponse.ok("Cảm ơn bạn! Phản hồi của bạn đã được gửi", service.accept(user, id));
    }

    @PostMapping("/api/matches/{id}/reject")
    @PreAuthorize("hasRole('DONOR')")
    public ApiResponse<DonorMatchResponse> reject(@AuthenticationPrincipal AuthUser user, @PathVariable UUID id) {
        return ApiResponse.ok("Đã ghi nhận phản hồi", service.reject(user, id));
    }

    @PostMapping("/api/matches/{id}/complete")
    @PreAuthorize("hasAnyRole('REQUESTER','ORGANIZATION','ADMIN')")
    public ApiResponse<RequestMatchEntry> complete(@AuthenticationPrincipal AuthUser user, @PathVariable UUID id) {
        return ApiResponse.ok("Đã ghi nhận lần hiến máu", service.complete(user, id));
    }

    @PostMapping("/api/matches/{id}/no-show")
    @PreAuthorize("hasAnyRole('REQUESTER','ORGANIZATION','ADMIN')")
    public ApiResponse<RequestMatchEntry> noShow(@AuthenticationPrincipal AuthUser user, @PathVariable UUID id) {
        return ApiResponse.ok("Đã đóng lượt nhận lời", service.markNoShow(user, id));
    }

    @GetMapping("/api/requests/{id}/matches")
    @PreAuthorize("hasAnyRole('REQUESTER','ORGANIZATION','ADMIN')")
    public ApiResponse<List<RequestMatchEntry>> requestMatches(@AuthenticationPrincipal AuthUser user,
                                                               @PathVariable UUID id) {
        return ApiResponse.ok("OK", service.listForRequest(user, id));
    }
}
