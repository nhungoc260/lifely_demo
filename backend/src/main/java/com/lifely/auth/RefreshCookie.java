package com.lifely.auth;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Cookie chứa refresh token: httpOnly (JavaScript không đọc được nên XSS không lấy được token),
 * giới hạn path /api/auth, SameSite mặc định Lax. Khi chạy HTTPS thật hãy đặt
 * COOKIE_SECURE=true; nếu frontend và backend khác "site" thì đặt COOKIE_SAME_SITE=None (bắt buộc kèm Secure).
 */
@Component
public class RefreshCookie {

    public static final String NAME = "lifely_refresh";
    private static final String PATH = "/api/auth";

    private final boolean secure;
    private final String sameSite;

    public RefreshCookie(@Value("${lifely.auth.cookie-secure:false}") boolean secure,
                         @Value("${lifely.auth.cookie-same-site:Lax}") String sameSite) {
        this.secure = secure;
        this.sameSite = sameSite;
    }

    public void write(HttpServletResponse response, String token, Duration maxAge) {
        add(response, build(token, maxAge));
    }

    public void clear(HttpServletResponse response) {
        add(response, build("", Duration.ZERO));
    }

    private ResponseCookie build(String value, Duration maxAge) {
        return ResponseCookie.from(NAME, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite(sameSite)
                .path(PATH)
                .maxAge(maxAge)
                .build();
    }

    private static void add(HttpServletResponse response, ResponseCookie cookie) {
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }
}
