package com.lifely.notify;

import com.lifely.auth.AuthUser;
import com.lifely.common.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@Tag(name = "Notification delivery")
public class DeliveryController {

    private final DeliveryService service;

    public DeliveryController(DeliveryService service) {
        this.service = service;
    }

    @GetMapping("/api/requests/{id}/delivery")
    @PreAuthorize("hasAnyRole('REQUESTER','ORGANIZATION','ADMIN')")
    public ApiResponse<DeliveryService.Delivery> summary(@AuthenticationPrincipal AuthUser user, @PathVariable UUID id) {
        return ApiResponse.ok("OK", service.summary(user.getId(), id));
    }

    @PostMapping("/api/requests/{id}/delivery/retry")
    @PreAuthorize("hasAnyRole('ORGANIZATION','ADMIN')")
    public ApiResponse<Map<String, Integer>> retry(@AuthenticationPrincipal AuthUser user, @PathVariable UUID id) {
        return ApiResponse.ok("Đã xếp lại các thông báo lỗi", Map.of("requeued", service.retryFailed(user.getId(), id)));
    }
}
