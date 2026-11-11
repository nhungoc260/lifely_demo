package com.lifely.matching;

import com.lifely.auth.AuthUser;
import com.lifely.appointment.AppointmentDtos.PayTravelSupportRequest;
import com.lifely.common.ApiResponse;
import com.lifely.matching.dto.DonorMatchResponse;
import com.lifely.matching.dto.RequestMatchEntry;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@Tag(name = "Matching")
public class MatchController {

    private final MatchService service;
    private final MatchSupportService supportService;

    public MatchController(MatchService service, MatchSupportService supportService) {
        this.service = service;
        this.supportService = supportService;
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

    /** Cơ sở ghi nhận đã chi hỗ trợ đi lại cho lượt hiến khẩn cấp (body trống = mức cơ sở đã công bố). */
    @PostMapping("/api/matches/{id}/travel-support")
    @PreAuthorize("hasRole('ORGANIZATION')")
    public ApiResponse<MatchSupportService.Result> payTravelSupport(@AuthenticationPrincipal AuthUser user, @PathVariable UUID id,
                                                                    @Valid @RequestBody(required = false) PayTravelSupportRequest req) {
        return ApiResponse.ok("Đã ghi nhận hỗ trợ đi lại", supportService.pay(user, id, req == null ? null : req.amountVnd()));
    }

    @PostMapping("/api/matches/{id}/no-show")
    @PreAuthorize("hasAnyRole('REQUESTER','ORGANIZATION','ADMIN')")
    public ApiResponse<RequestMatchEntry> noShow(@AuthenticationPrincipal AuthUser user, @PathVariable UUID id) {
        return ApiResponse.ok("Đã đóng lượt nhận lời", service.markNoShow(user, id));
    }

    /** Nhân viên tự khai kết quả sau khi gọi người hiến bằng ứng dụng gọi điện của thiết bị; hệ thống không gọi điện. */
    @PostMapping("/api/matches/{id}/contact-result")
    @PreAuthorize("hasAnyRole('REQUESTER','ORGANIZATION','ADMIN')")
    public ApiResponse<RequestMatchEntry> contactResult(@AuthenticationPrincipal AuthUser user, @PathVariable UUID id,
                                                        @jakarta.validation.Valid @RequestBody ContactResultRequest req) {
        return ApiResponse.ok("Đã ghi nhận kết quả liên hệ", service.recordContactResult(user, id, req.result()));
    }

    public record ContactResultRequest(@jakarta.validation.constraints.NotNull ContactResult result) {
    }

    @GetMapping("/api/requests/{id}/matches")
    @PreAuthorize("hasAnyRole('REQUESTER','ORGANIZATION','ADMIN')")
    public ApiResponse<List<RequestMatchEntry>> requestMatches(@AuthenticationPrincipal AuthUser user,
                                                               @PathVariable UUID id) {
        return ApiResponse.ok("OK", service.listForRequest(user, id));
    }
}
