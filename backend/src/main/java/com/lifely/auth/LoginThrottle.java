package com.lifely.auth;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Đếm đăng nhập sai theo cặp (email, IP). Kẻ tấn công chỉ tự khóa chính IP của mình,
 * không khóa được người dùng thật ở nơi khác. Trong bộ nhớ, phù hợp một instance.
 */
class LoginThrottle {

    static final int MAX_FAILURES = 5;
    static final Duration LOCK = Duration.ofMinutes(15);

    private static final class Entry {
        int failures;
        Instant lockedUntil;
        Instant lastFailure;
    }

    private final Map<String, Entry> entries = new ConcurrentHashMap<>();

    boolean isLocked(String key, Instant now) {
        Entry e = entries.get(key);
        if (e == null) return false;
        synchronized (e) {
            return e.lockedUntil != null && e.lockedUntil.isAfter(now);
        }
    }

    void recordFailure(String key, Instant now) {
        Entry e = entries.computeIfAbsent(key, k -> new Entry());
        synchronized (e) {
            if (e.lastFailure != null && e.lastFailure.plus(LOCK).isBefore(now)) e.failures = 0;
            e.failures++;
            e.lastFailure = now;
            if (e.failures >= MAX_FAILURES) {
                e.lockedUntil = now.plus(LOCK);
                e.failures = 0;
            }
        }
        if (entries.size() > 10_000) {
            entries.entrySet().removeIf(en -> {
                Entry v = en.getValue();
                synchronized (v) {
                    boolean lockExpired = v.lockedUntil == null || v.lockedUntil.isBefore(now);
                    boolean stale = v.lastFailure == null || v.lastFailure.plus(LOCK).isBefore(now);
                    return lockExpired && stale;
                }
            });
        }
    }

    void clear(String key) {
        entries.remove(key);
    }
}
