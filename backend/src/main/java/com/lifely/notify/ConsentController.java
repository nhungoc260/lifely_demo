package com.lifely.notify;

import com.lifely.auth.AuthUser;
import com.lifely.common.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users/me/consents")
@Tag(name = "Notification consents")
public class ConsentController {

    private final ConsentService service;

    public ConsentController(ConsentService service) {
        this.service = service;
    }

    @GetMapping
    public ApiResponse<ConsentService.Consents> get(@AuthenticationPrincipal AuthUser user) {
        return ApiResponse.ok("OK", service.get(user.getId()));
    }

    @PutMapping
    public ApiResponse<ConsentService.Consents> update(@AuthenticationPrincipal AuthUser user,
                                                       @RequestBody ConsentService.Update req) {
        return ApiResponse.ok("Đã cập nhật lựa chọn nhận thông báo", service.update(user.getId(), req));
    }
}
