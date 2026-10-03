package com.lifely.config;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Cấu hình JWT. Ứng dụng từ chối khởi động nếu thiếu secret hoặc secret quá ngắn
 * (HS256 cần tối thiểu 32 ký tự).
 */
@Validated
@ConfigurationProperties(prefix = "lifely.jwt")
public record JwtProperties(
        @NotBlank @Size(min = 32, message = "JWT_SECRET must be at least 32 characters") String secret,
        @Min(1) long expirationMinutes) {
}
