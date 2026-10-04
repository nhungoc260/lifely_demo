package com.lifely.request;

import com.lifely.auth.AuthUser;
import com.lifely.common.ApiResponse;
import com.lifely.common.PageResponse;
import com.lifely.request.dto.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import com.lifely.common.Patterns;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Pattern;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/requests")
@PreAuthorize("hasAnyRole('REQUESTER','ORGANIZATION')")
@Validated
@Tag(name = "Blood requests")
public class RequestController {

    private final RequestService service;
    private final CoverageService coverageService;

    public RequestController(RequestService service, CoverageService coverageService) {
        this.service = service;
        this.coverageService = coverageService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<RequestResponse>> create(@AuthenticationPrincipal AuthUser user,
                                                               @Valid @RequestBody CreateRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Request created successfully", service.create(user, dto)));
    }

    @GetMapping
    public ApiResponse<PageResponse<RequestResponse>> listMine(@AuthenticationPrincipal AuthUser user,
                                                               @RequestParam(required = false) RequestStatus status,
                                                               @RequestParam(defaultValue = "0") int page,
                                                               @RequestParam(defaultValue = "10") int size) {
        return ApiResponse.ok("OK", service.listMine(user, status, page, size));
    }

    /** Ước lượng có bao nhiêu donor phù hợp quanh điểm cần máu (chỉ mức độ, không lộ danh tính). */
    @GetMapping("/coverage")
    public ApiResponse<List<CoverageService.Ring>> coverage(
            @RequestParam @Pattern(regexp = Patterns.BLOOD_TYPE) String bloodType,
            @RequestParam @DecimalMin("-90") @DecimalMax("90") double lat,
            @RequestParam @DecimalMin("-180") @DecimalMax("180") double lng) {
        return ApiResponse.ok("OK", coverageService.coverage(bloodType, lat, lng));
    }

    @GetMapping("/dashboard")
    public ApiResponse<RequesterDashboard> dashboard(@AuthenticationPrincipal AuthUser user) {
        return ApiResponse.ok("OK", service.dashboard(user));
    }

    @GetMapping("/{id}")
    public ApiResponse<RequestResponse> detail(@AuthenticationPrincipal AuthUser user, @PathVariable UUID id) {
        return ApiResponse.ok("OK", service.detail(user, id));
    }

    @PutMapping("/{id}")
    public ApiResponse<RequestResponse> update(@AuthenticationPrincipal AuthUser user, @PathVariable UUID id,
                                               @Valid @RequestBody UpdateRequestDto dto) {
        return ApiResponse.ok("Request updated", service.update(user, id, dto));
    }

    @PostMapping("/{id}/cancel")
    public ApiResponse<RequestResponse> cancel(@AuthenticationPrincipal AuthUser user, @PathVariable UUID id,
                                               @Valid @RequestBody(required = false) CancelRequestDto dto) {
        return ApiResponse.ok("Request cancelled", service.cancel(user, id, dto == null ? null : dto.reason()));
    }

    @GetMapping("/{id}/history")
    public ApiResponse<List<HistoryEntry>> history(@AuthenticationPrincipal AuthUser user, @PathVariable UUID id) {
        return ApiResponse.ok("OK", service.history(user, id));
    }
}
