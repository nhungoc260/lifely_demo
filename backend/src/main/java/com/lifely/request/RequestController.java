package com.lifely.request;

import com.lifely.auth.AuthUser;
import com.lifely.common.ApiResponse;
import com.lifely.common.PageResponse;
import com.lifely.request.dto.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/requests")
@PreAuthorize("hasAnyRole('REQUESTER','ORGANIZATION')")
@Tag(name = "Blood requests")
public class RequestController {

    private final RequestService service;

    public RequestController(RequestService service) {
        this.service = service;
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
