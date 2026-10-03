package com.lifely.common;

import org.springframework.http.HttpStatus;

/** Lỗi nghiệp vụ có mã lỗi riêng, ví dụ REQUEST_FULFILLED. */
public class AppException extends RuntimeException {

    private final String code;
    private final HttpStatus status;

    public AppException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public static AppException badRequest(String code, String message) {
        return new AppException(HttpStatus.BAD_REQUEST, code, message);
    }

    public static AppException notFound(String code, String message) {
        return new AppException(HttpStatus.NOT_FOUND, code, message);
    }

    public static AppException conflict(String code, String message) {
        return new AppException(HttpStatus.CONFLICT, code, message);
    }

    public static AppException forbidden(String code, String message) {
        return new AppException(HttpStatus.FORBIDDEN, code, message);
    }

    public static AppException unauthorized(String code, String message) {
        return new AppException(HttpStatus.UNAUTHORIZED, code, message);
    }

    public String getCode() {
        return code;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
