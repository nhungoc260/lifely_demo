package com.lifely.notification;

import com.lifely.auth.AuthUser;
import com.lifely.common.ApiResponse;
import com.lifely.common.PageResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@Tag(name = "Notifications")
public class NotificationController {

    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    @GetMapping
    public ApiResponse<PageResponse<NotificationDto>> list(@AuthenticationPrincipal AuthUser user,
                                                           @RequestParam(defaultValue = "false") boolean unreadOnly,
                                                           @RequestParam(defaultValue = "0") int page,
                                                           @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok("OK", service.list(user.getId(), unreadOnly, page, size));
    }

    @GetMapping("/unread-count")
    public ApiResponse<Map<String, Long>> unreadCount(@AuthenticationPrincipal AuthUser user) {
        return ApiResponse.ok("OK", Map.of("unread", service.unreadCount(user.getId())));
    }

    @PutMapping("/{id}/read")
    public ApiResponse<NotificationDto> markRead(@AuthenticationPrincipal AuthUser user, @PathVariable UUID id) {
        return ApiResponse.ok("Đã đánh dấu đã đọc", service.markRead(user.getId(), id));
    }

    @PutMapping("/read-all")
    public ApiResponse<Map<String, Integer>> markAllRead(@AuthenticationPrincipal AuthUser user) {
        return ApiResponse.ok("Đã đánh dấu tất cả thông báo là đã đọc", Map.of("updated", service.markAllRead(user.getId())));
    }
}
