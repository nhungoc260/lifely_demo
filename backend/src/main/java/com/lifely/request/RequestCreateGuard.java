package com.lifely.request;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Tuần tự hóa việc tạo yêu cầu của cùng một người bằng advisory lock theo transaction (tự nhả khi commit/rollback).
 * Nhờ đó bấm đúp, nhiều tab hoặc retry mạng không thể cùng vượt qua kiểm tra giới hạn / trùng lặp.
 */
@Component
public class RequestCreateGuard {

    private final JdbcTemplate jdbc;

    public RequestCreateGuard(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Phải gọi trong transaction đang mở. */
    public void lockRequester(UUID userId) {
        jdbc.queryForObject("SELECT count(*) FROM (SELECT pg_advisory_xact_lock(hashtextextended(?, 0))) t",
                Long.class, "create-request:" + userId);
    }
}
