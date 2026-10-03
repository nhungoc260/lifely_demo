package com.lifely.user;

import com.lifely.auth.AuthUser;
import com.lifely.auth.dto.UserSummary;
import com.lifely.common.ApiResponse;
import com.lifely.common.AppException;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users/me")
@Tag(name = "Users")
public class UserController {

    public record OnboardingRequest(@Min(1) @Max(6) int step, boolean completed) {
    }

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
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

    private User load(AuthUser auth) {
        return userRepository.findById(auth.getId())
                .orElseThrow(() -> AppException.notFound("USER_NOT_FOUND", "User not found"));
    }
}
