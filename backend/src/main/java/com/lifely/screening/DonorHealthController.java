package com.lifely.screening;

import com.lifely.auth.AuthUser;
import com.lifely.common.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

/** Chỉ người hiến đã đăng nhập, chỉ dữ liệu của chính mình. Không có endpoint nào cho vai trò khác xem dữ liệu sức khỏe. */
@RestController
@RequestMapping("/api/donors/me/health")
@PreAuthorize("hasRole('DONOR')")
@Validated
@Tag(name = "Donor health")
public class DonorHealthController {

    public record ConsentRequest(boolean granted, boolean deleteData) {
    }

    public record GenderRequest(@NotBlank String gender) {
    }

    private final DonorHealthService service;

    public DonorHealthController(DonorHealthService service) {
        this.service = service;
    }

    @GetMapping
    public ApiResponse<DonorHealthService.Summary> summary(@AuthenticationPrincipal AuthUser user) {
        return ApiResponse.ok("OK", service.summary(user.getId()));
    }

    @PostMapping("/evaluate")
    public ApiResponse<DonorHealthService.Evaluation> evaluate(@AuthenticationPrincipal AuthUser user,
                                                          @RequestBody DonorHealthService.AddRequest req) {
        return ApiResponse.ok("OK", service.evaluate(user.getId(), req));
    }

    @GetMapping("/checks")
    public ApiResponse<List<DonorHealthService.CheckDto>> list(@AuthenticationPrincipal AuthUser user,
                                                          @RequestParam(defaultValue = "100") int limit) {
        return ApiResponse.ok("OK", service.list(user.getId(), limit));
    }

    @PostMapping("/checks")
    public ResponseEntity<ApiResponse<DonorHealthService.CheckDto>> add(@AuthenticationPrincipal AuthUser user,
                                                                   @RequestBody DonorHealthService.AddRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Đã lưu kết quả", service.add(user.getId(), req)));
    }

    @DeleteMapping("/checks")
    public ApiResponse<Map<String, Integer>> deleteAll(@AuthenticationPrincipal AuthUser user) {
        return ApiResponse.ok("Đã xóa lịch sử sức khỏe", Map.of("deleted", service.deleteAll(user.getId())));
    }

    @PutMapping("/consent")
    public ApiResponse<DonorHealthService.Summary> consent(@AuthenticationPrincipal AuthUser user, @RequestBody ConsentRequest req) {
        return ApiResponse.ok("Đã cập nhật lựa chọn", service.setConsent(user.getId(), req.granted(), req.deleteData()));
    }

    @PutMapping("/gender")
    public ApiResponse<DonorHealthService.Summary> gender(@AuthenticationPrincipal AuthUser user, @RequestBody GenderRequest req) {
        return ApiResponse.ok("Đã cập nhật", service.setGender(user.getId(), req.gender()));
    }

    @GetMapping("/export")
    public ResponseEntity<?> export(@AuthenticationPrincipal AuthUser user, @RequestParam(defaultValue = "json") String format) {
        if ("csv".equalsIgnoreCase(format)) {
            byte[] body = service.exportCsv(user.getId()).getBytes(StandardCharsets.UTF_8);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"lifely-suc-khoe.csv\"")
                    .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8)).body(body);
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"lifely-suc-khoe.json\"")
                .contentType(MediaType.APPLICATION_JSON).body(service.export(user.getId()));
    }
}
