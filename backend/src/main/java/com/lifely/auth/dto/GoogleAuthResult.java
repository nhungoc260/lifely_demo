package com.lifely.auth.dto;

/**
 * Kết quả đăng nhập bằng Google. Email đã có tài khoản: needsProfile = false và auth chứa phiên đăng nhập.
 * Email mới: needsProfile = true, kèm email và tên để giao diện hiển thị bước chọn vai trò.
 */
public record GoogleAuthResult(boolean needsProfile, AuthResponse auth, String email, String fullName) {

    public static GoogleAuthResult loggedIn(AuthResponse auth) {
        return new GoogleAuthResult(false, auth, null, null);
    }

    public static GoogleAuthResult pendingProfile(String email, String fullName) {
        return new GoogleAuthResult(true, null, email, fullName);
    }
}
