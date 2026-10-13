package com.lifely.inventory;

import com.lifely.auth.AuthUser;
import com.lifely.common.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/organizations/me/inventory")
@Tag(name = "Inventory")
public class InventoryController {

    private final InventoryService service;

    public InventoryController(InventoryService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasRole('ORGANIZATION')")
    public ApiResponse<List<InventoryItem>> get(@AuthenticationPrincipal AuthUser user) {
        return ApiResponse.ok("OK", service.get(user.getId()));
    }

    @GetMapping("/settings")
    @PreAuthorize("hasRole('ORGANIZATION')")
    public ApiResponse<InventorySettings> settings(@AuthenticationPrincipal AuthUser user) {
        return ApiResponse.ok("OK", service.settings(user.getId()));
    }

    @PutMapping("/settings")
    @PreAuthorize("hasRole('ORGANIZATION')")
    public ApiResponse<InventorySettings> updateSettings(@AuthenticationPrincipal AuthUser user,
                                                         @Valid @RequestBody InventorySettings req) {
        return ApiResponse.ok("Đã lưu tuỳ chọn", service.updateSettings(user.getId(), req.autoAdd()));
    }

    @PutMapping
    @PreAuthorize("hasRole('ORGANIZATION')")
    public ApiResponse<List<InventoryItem>> update(@AuthenticationPrincipal AuthUser user,
                                                   @Valid @RequestBody UpdateInventoryRequest req) {
        return ApiResponse.ok("Đã cập nhật kho máu", service.update(user.getId(), req));
    }
}
