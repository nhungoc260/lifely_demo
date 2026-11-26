package com.lifely.config;

/**
 * Ghi nhận lần cuối có người dùng thật gọi API. Các job nền dùng để tạm dừng khi không ai truy cập,
 * giúp database (Neon gói free) được tự ngủ thay vì bị truy vấn liên tục 24/7 và hết quota compute.
 *
 * Cửa sổ hoạt động mặc định 10 phút, chỉnh bằng biến môi trường JOBS_IDLE_MINUTES.
 * Đặt JOBS_IDLE_MINUTES=0 để tắt cơ chế này (job luôn chạy như cũ).
 */
public final class ActivityTracker {

    private static final long WINDOW_MS = readWindowMs();
    private static volatile long lastActivityMs = System.currentTimeMillis();

    private ActivityTracker() {
    }

    private static long readWindowMs() {
        String v = System.getenv("JOBS_IDLE_MINUTES");
        long minutes = 10;
        if (v != null && !v.isBlank()) {
            try {
                minutes = Long.parseLong(v.trim());
            } catch (NumberFormatException ignored) {
                // giữ mặc định
            }
        }
        return minutes * 60_000L;
    }

    public static void touch() {
        lastActivityMs = System.currentTimeMillis();
    }

    /** true nếu job nên chạy: vừa có người dùng truy cập, hoặc cơ chế tạm dừng bị tắt. */
    public static boolean shouldRunJobs() {
        return WINDOW_MS <= 0 || System.currentTimeMillis() - lastActivityMs < WINDOW_MS;
    }
}
