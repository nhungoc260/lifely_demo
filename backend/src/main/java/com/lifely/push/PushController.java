package com.lifely.push;

import com.lifely.auth.AuthUser;
import com.lifely.common.ApiResponse;
import com.lifely.notify.OutboxService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/push")
@Tag(name = "Web Push")
public class PushController {

    public record Keys(@NotBlank @Size(max = 200) String p256dh, @NotBlank @Size(max = 100) String auth) {
    }

    public record SubscribeRequest(@NotBlank @Size(max = 2000) String endpoint, @NotNull @Valid Keys keys) {
    }

    public record UnsubscribeRequest(@NotBlank @Size(max = 2000) String endpoint) {
    }

    private final PushService service;
    private final WebPushSender sender;
    private final OutboxService outbox;

    public PushController(PushService service, WebPushSender sender, OutboxService outbox) {
        this.service = service;
        this.sender = sender;
        this.outbox = outbox;
    }

    /** Khóa công khai để trình duyệt đăng ký; enabled=false khi máy chủ chưa cấu hình Web Push. */
    @GetMapping("/public-key")
    public ApiResponse<Map<String, Object>> publicKey(@AuthenticationPrincipal AuthUser user) {
        boolean enabled = sender.isConfigured();
        return ApiResponse.ok("OK", Map.of("enabled", enabled, "publicKey", enabled ? service.publicKey() : "",
                "subscribed", service.count(user.getId()) > 0));
    }

    @PostMapping("/subscriptions")
    public ApiResponse<Map<String, Object>> subscribe(@AuthenticationPrincipal AuthUser user,
                                                      @RequestHeader(value = "User-Agent", required = false) String userAgent,
                                                      @Valid @RequestBody SubscribeRequest req) {
        service.subscribe(user.getId(), req.endpoint(), req.keys().p256dh(), req.keys().auth(), userAgent);
        return ApiResponse.ok("Đã bật thông báo đẩy trên thiết bị này", Map.of("subscribed", true));
    }

    /** Gửi một thông báo thử tới chính người dùng (để kiểm tra thiết bị). Đi qua outbox nên chịu cùng giới hạn tần suất. */
    @PostMapping("/test")
    public ApiResponse<Map<String, Object>> test(@AuthenticationPrincipal AuthUser user) {
        boolean queued = outbox.enqueuePush(user.getId(), "PUSH_TEST", "USER", user.getId(), "Thông báo thử từ LIFELY",
                "Nếu bạn thấy tin này, thông báo đẩy đã hoạt động trên thiết bị của bạn.", "/",
                "PUSH:TEST:" + UUID.randomUUID());
        return ApiResponse.ok(queued ? "Đã gửi thông báo thử, vài giây nữa sẽ hiện lên" : "Chưa thể gửi: hãy bật thông báo đẩy trên thiết bị này trước",
                Map.of("queued", queued));
    }

    @DeleteMapping("/subscriptions")
    public ApiResponse<Map<String, Object>> unsubscribe(@AuthenticationPrincipal AuthUser user,
                                                        @Valid @RequestBody UnsubscribeRequest req) {
        service.unsubscribe(user.getId(), req.endpoint());
        return ApiResponse.ok("Đã tắt thông báo đẩy trên thiết bị này", Map.of("subscribed", service.count(user.getId()) > 0));
    }
}
