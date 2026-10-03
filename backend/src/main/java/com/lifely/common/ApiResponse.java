package com.lifely.common;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.Map;

/**
 * Định dạng phản hồi chuẩn của toàn bộ API (đặc tả mục 74).
 * Thành công: success, message, data. Lỗi: success, message, code (+ errors khi validate).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(
        boolean success,
        String message,
        T data,
        String code,
        Map<String, String> errors) {

    public static <T> ApiResponse<T> ok(String message, T data) {
        return new ApiResponse<>(true, message, data, null, null);
    }

    public static ApiResponse<Void> error(String message, String code) {
        return new ApiResponse<>(false, message, null, code, null);
    }

    public static ApiResponse<Void> validationError(String message, Map<String, String> errors) {
        return new ApiResponse<>(false, message, null, "VALIDATION_ERROR", errors);
    }
}
