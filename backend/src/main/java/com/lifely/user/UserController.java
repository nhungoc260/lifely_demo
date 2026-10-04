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
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users/me")
@Tag(name = "Users")
public class UserController {

    public record OnboardingRequest(@Min(1) @Max(6) int step, boolean completed) {
    }

    public record DeleteRequest(@NotBlank String password) {
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
        return ApiResponse.ok("Progress saved", UserSummary.from(userRepository.save(user)));
    }

    /** Tải xuống toàn bộ dữ liệu cá nhân của chính mình (JSON). */
    @GetMapping("/export")
    public ApiResponse<java.util.Map<String, Object>> export(@AuthenticationPrincipal AuthUser auth) {
        return ApiResponse.ok("Your data", dataService.export(auth));
    }

    /** Xóa (ẩn danh hóa) tài khoản. Bắt buộc nhập lại mật khẩu. */
    @PostMapping("/delete")
    public ApiResponse<Void> delete(@AuthenticationPrincipal AuthUser auth, @Valid @RequestBody DeleteRequest req) {
        dataService.deleteAccount(auth, req.password());
        return ApiResponse.ok("Your account has been deleted", null);
    }

    private User load(AuthUser auth) {
        return userRepository.findById(auth.getId())
                .orElseThrow(() -> AppException.notFound("USER_NOT_FOUND", "User not found"));
    }
}
