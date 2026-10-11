package com.lifely.auth;

import com.lifely.auth.dto.*;
import com.lifely.common.ApiResponse;
import com.lifely.common.AppException;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication")
public class AuthController {

    /** Header tùy chỉnh bắt buộc trên /refresh và /logout: trình duyệt không cho site lạ gửi header này nếu CORS không cho phép. */
    static final String CLIENT_HEADER = "X-Lifely-Client";

    private final AuthService authService;
    private final RefreshCookie refreshCookie;

    public AuthController(AuthService authService, RefreshCookie refreshCookie) {
        this.authService = authService;
        this.refreshCookie = refreshCookie;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request,
                                                              HttpServletResponse response) {
        AuthResponse auth = authService.register(request);
        refreshCookie.write(response, authService.startSession(auth.user().id()), authService.refreshTtl());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Tạo tài khoản thành công", auth));
    }

    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        AuthResponse auth = authService.login(request);
        refreshCookie.write(response, authService.startSession(auth.user().id()), authService.refreshTtl());
        return ApiResponse.ok("Đăng nhập thành công", auth);
    }

    /** Đăng nhập bằng Google: email đã có tài khoản thì vào luôn, email mới thì trả needsProfile để chọn vai trò. */
    @PostMapping("/google")
    public ApiResponse<GoogleAuthResult> google(@Valid @RequestBody GoogleLoginRequest request,
                                                HttpServletResponse response) {
        AuthService.GoogleOutcome outcome = authService.googleLogin(request.credential());
        if (outcome.auth() == null) {
            return ApiResponse.ok("Cần bổ sung vai trò và số điện thoại để hoàn tất",
                    GoogleAuthResult.pendingProfile(outcome.email(), outcome.fullName()));
        }
        refreshCookie.write(response, authService.startSession(outcome.auth().user().id()), authService.refreshTtl());
        return ApiResponse.ok("Đăng nhập thành công", GoogleAuthResult.loggedIn(outcome.auth()));
    }

    @PostMapping("/google/register")
    public ResponseEntity<ApiResponse<AuthResponse>> googleRegister(@Valid @RequestBody GoogleRegisterRequest request,
                                                                    HttpServletResponse response) {
        AuthResponse auth = authService.googleRegister(request);
        refreshCookie.write(response, authService.startSession(auth.user().id()), authService.refreshTtl());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Tạo tài khoản thành công", auth));
    }

    @PostMapping("/refresh")
    public ApiResponse<AuthResponse> refresh(
            @CookieValue(name = RefreshCookie.NAME, required = false) String refreshToken,
            @RequestHeader(name = CLIENT_HEADER, required = false) String client,
            HttpServletResponse response) {
        requireClientHeader(client);
        try {
            AuthService.RefreshedSession session = authService.refresh(refreshToken);
            refreshCookie.write(response, session.refreshToken(), authService.refreshTtl());
            return ApiResponse.ok("Đã gia hạn phiên đăng nhập", session.auth());
        } catch (AppException e) {
            refreshCookie.clear(response);   // token hỏng/hết hạn: xóa cookie để trình duyệt không gửi lại
            throw e;
        }
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(
            @CookieValue(name = RefreshCookie.NAME, required = false) String refreshToken,
            @RequestHeader(name = CLIENT_HEADER, required = false) String client,
            HttpServletResponse response) {
        requireClientHeader(client);
        authService.logout(refreshToken);
        refreshCookie.clear(response);
        return ApiResponse.ok("Đã đăng xuất", null);
    }

    @PostMapping("/forgot-password")
    public ApiResponse<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ApiResponse.ok("Nếu email này có tài khoản, liên kết đặt lại mật khẩu đã được gửi", null);
    }

    @PostMapping("/reset-password")
    public ApiResponse<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ApiResponse.ok("Đã cập nhật mật khẩu. Bạn có thể đăng nhập ngay", null);
    }

    private static void requireClientHeader(String client) {
        if (client == null || client.isBlank()) {
            throw AppException.forbidden("CLIENT_HEADER_REQUIRED", "Yêu cầu không hợp lệ");
        }
    }
}
