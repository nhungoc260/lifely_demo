package com.lifely.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifely.common.ApiResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Giới hạn tần suất theo IP cho các endpoint nhạy cảm (đăng nhập, đăng ký, quên mật khẩu, tạo report)
 * để chống brute-force và spam. Cửa sổ trượt trong bộ nhớ: phù hợp một instance;
 * khi chạy nhiều instance cần chuyển sang Redis hoặc gateway.
 */
public class RateLimitFilter extends OncePerRequestFilter {

    private static final long WINDOW_MS = 60_000;
    private final int maxPerWindow;
    private final ObjectMapper mapper;
    private final ClientIp clientIp;
    private final Map<String, Deque<Long>> hits = new ConcurrentHashMap<>();

    public RateLimitFilter(int maxPerWindow, ObjectMapper mapper, ClientIp clientIp) {
        this.maxPerWindow = maxPerWindow;
        this.mapper = mapper;
        this.clientIp = clientIp;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !("POST".equals(request.getMethod())
                && (path.equals("/api/auth/login") || path.equals("/api/auth/register")
                || path.equals("/api/auth/google") || path.equals("/api/auth/google/register")
                || path.equals("/api/auth/forgot-password") || path.equals("/api/auth/reset-password")
                || path.equals("/api/auth/verify-email") || path.equals("/api/auth/resend-verification")
                || path.equals("/api/reports") || path.equals("/api/public/contact") || path.equals("/api/users/me/delete")));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String key = clientIp.resolve(request) + "|" + request.getRequestURI();
        long now = System.currentTimeMillis();
        Deque<Long> window = hits.computeIfAbsent(key, k -> new ArrayDeque<>());
        boolean allowed;
        synchronized (window) {
            while (!window.isEmpty() && now - window.peekFirst() > WINDOW_MS) {
                window.pollFirst();
            }
            allowed = window.size() < maxPerWindow;
            if (allowed) {
                window.addLast(now);
            }
        }
        if (!allowed) {
            response.setStatus(429);
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            mapper.writeValue(response.getWriter(),
                    ApiResponse.error("Bạn thao tác quá nhiều lần. Vui lòng đợi một phút rồi thử lại.", "RATE_LIMITED"));
            return;
        }
        if (hits.size() > 10_000) {
            // dọn các khóa đã hết hạn cửa sổ (trước đây chỉ xóa deque rỗng nên map phình mãi)
            hits.entrySet().removeIf(e -> {
                synchronized (e.getValue()) {
                    Long last = e.getValue().peekLast();
                    return last == null || now - last > WINDOW_MS;
                }
            });
        }
        chain.doFilter(request, response);
    }
}
