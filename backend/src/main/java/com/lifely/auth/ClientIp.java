package com.lifely.auth;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Xác định IP thật của client. Sau proxy (Vercel rewrite, Render) getRemoteAddr() là IP của proxy,
 * nên mọi người dùng dùng chung một bộ đếm. {@code lifely.rate-limit.proxy-hops} là số proxy tin cậy
 * đứng trước ứng dụng; 0 (mặc định) = chỉ dùng getRemoteAddr(), không tin header X-Forwarded-For
 * (tránh bị giả mạo khi chạy trực tiếp).
 */
@Component
public class ClientIp {

    private final int hops;

    public ClientIp(@Value("${lifely.rate-limit.proxy-hops:0}") int hops) {
        this.hops = Math.max(0, hops);
    }

    public String resolve(HttpServletRequest request) {
        String remote = request.getRemoteAddr();
        if (hops == 0) return remote;
        String xff = request.getHeader("X-Forwarded-For");
        if (xff == null || xff.isBlank()) return remote;
        String[] parts = xff.split(",");
        // proxy tin cậy gần nhất thêm IP mà nó thấy vào cuối danh sách; lấy phần tử tính từ phải sang theo số hop
        int idx = parts.length - hops;
        if (idx < 0) idx = 0;
        String ip = parts[idx].trim();
        return ip.isEmpty() ? remote : ip;
    }
}
