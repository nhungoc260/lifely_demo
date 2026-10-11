package com.lifely.user;

import com.lifely.auth.AuthUser;
import com.lifely.auth.dto.UserSummary;
import com.lifely.common.ApiResponse;
import com.lifely.common.AppException;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users/me")
@Tag(name = "Users")
public class UserController {

    public record OnboardingRequest(@Min(1) @Max(6) int step, boolean completed) {
    }

    /** Xác nhận xóa tài khoản bằng mật khẩu, hoặc bằng ID token Google (cho tài khoản tạo qua Google, không có mật khẩu). */
    public record DeleteRequest(@Size(max = 200) String password, @Size(max = 4096) String googleCredential) {
    }

    private final UserRepository userRepository;
    private final UserDataService dataService;

    public UserController(UserRepository userRepository, UserDataService dataService) {
        this.userRepository = userRepository;
        this.dataService = dataService;
    }

    @GetMapping
    public ApiResponse<UserSummary> me(@AuthenticationPrincipal AuthUser auth) {
        return ApiResponse.ok("OK", UserSummary.from(load(auth)));
    }

    /** Lưu tiến độ onboarding để người dùng "Save & Continue Later". */
    @PutMapping("/onboarding")
    @Transactional
    public ApiResponse<UserSummary> onboarding(@AuthenticationPrincipal AuthUser auth,
                                               @Valid @RequestBody OnboardingRequest req) {
        User user = load(auth);
        user.setOnboardingStep(req.step());
        user.setOnboardingCompleted(req.completed());
        return ApiResponse.ok("Đã lưu tiến độ", UserSummary.from(userRepository.save(user)));
    }

    /** Tải xuống toàn bộ dữ liệu cá nhân của chính mình (JSON). */
    @GetMapping("/export")
    public ApiResponse<java.util.Map<String, Object>> export(@AuthenticationPrincipal AuthUser auth) {
        return ApiResponse.ok("Dữ liệu của bạn", dataService.export(auth));
    }

    /** Xóa (ẩn danh hóa) tài khoản. Bắt buộc nhập lại mật khẩu. */
    @PostMapping("/delete")
    public ApiResponse<Void> delete(@AuthenticationPrincipal AuthUser auth, @Valid @RequestBody DeleteRequest req) {
        dataService.deleteAccount(auth, req.password(), req.googleCredential());
        return ApiResponse.ok("Tài khoản của bạn đã được xóa", null);
    }

    private User load(AuthUser auth) {
        return userRepository.findById(auth.getId())
                .orElseThrow(() -> AppException.notFound("USER_NOT_FOUND", "Không tìm thấy người dùng"));
    }
}
