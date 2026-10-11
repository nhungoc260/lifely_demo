package com.lifely.donor;

import com.lifely.auth.AuthUser;
import com.lifely.common.ApiResponse;
import com.lifely.donor.dto.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/donors/me")
@PreAuthorize("hasRole('DONOR')")
@Tag(name = "Donors")
public class DonorController {

    private final DonorService service;

    public DonorController(DonorService service) {
        this.service = service;
    }

    @GetMapping
    public ApiResponse<DonorProfileResponse> me(@AuthenticationPrincipal AuthUser user) {
        return ApiResponse.ok("OK", service.getProfile(user.getId()));
    }

    @PutMapping
    public ApiResponse<DonorProfileResponse> update(@AuthenticationPrincipal AuthUser user,
                                                    @Valid @RequestBody UpdateDonorProfileRequest req) {
        return ApiResponse.ok("Đã cập nhật hồ sơ", service.updateProfile(user.getId(), req));
    }

    @PutMapping("/availability")
    public ApiResponse<DonorProfileResponse> availability(@AuthenticationPrincipal AuthUser user,
                                                          @Valid @RequestBody AvailabilityRequest req) {
        return ApiResponse.ok("Đã cập nhật trạng thái sẵn sàng", service.setAvailability(user.getId(), req.availability()));
    }

    @GetMapping("/privacy")
    public ApiResponse<PrivacyDto> privacy(@AuthenticationPrincipal AuthUser user) {
        return ApiResponse.ok("OK", service.getPrivacy(user.getId()));
    }

    @PutMapping("/privacy")
    public ApiResponse<PrivacyDto> updatePrivacy(@AuthenticationPrincipal AuthUser user,
                                                 @Valid @RequestBody PrivacyDto dto) {
        return ApiResponse.ok("Đã lưu cài đặt riêng tư", service.updatePrivacy(user.getId(), dto));
    }

    @GetMapping("/verification")
    public ApiResponse<DonorVerificationService.Summary> verification(@AuthenticationPrincipal AuthUser user) {
        return ApiResponse.ok("OK", service.verification(user.getId()));
    }

    @GetMapping("/history")
    public ApiResponse<List<DonationEntry>> history(@AuthenticationPrincipal AuthUser user) {
        return ApiResponse.ok("OK", service.history(user.getId()));
    }

    @PostMapping("/history")
    public ApiResponse<DonationEntry> addDonation(@AuthenticationPrincipal AuthUser user,
                                                  @Valid @RequestBody AddDonationRequest req) {
        return ApiResponse.ok("Đã ghi nhận lần hiến máu", service.addDonation(user.getId(), req));
    }

    @GetMapping("/dashboard")
    public ApiResponse<DonorDashboardResponse> dashboard(@AuthenticationPrincipal AuthUser user) {
        return ApiResponse.ok("OK", service.dashboard(user.getId()));
    }
}
