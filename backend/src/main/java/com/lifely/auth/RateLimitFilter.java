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
    private final Map<String, Deque<Long>> hits = new ConcurrentHashMap<>();

    public RateLimitFilter(int maxPerWindow, ObjectMapper mapper) {
        this.maxPerWindow = maxPerWindow;
        this.mapper = mapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !("POST".equals(request.getMethod())
                && (path.equals("/api/auth/login") || path.equals("/api/auth/register")
                || path.equals("/api/auth/forgot-password") || path.equals("/api/auth/reset-password")
                || path.equals("/api/reports")));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String key = request.getRemoteAddr() + "|" + request.getRequestURI();
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
                    ApiResponse.error("Too many attempts. Please wait a minute and try again.", "RATE_LIMITED"));
            return;
        }
        if (hits.size() > 10_000) {
            hits.entrySet().removeIf(e -> e.getValue().isEmpty());
        }
        chain.doFilter(request, response);
    }
}
