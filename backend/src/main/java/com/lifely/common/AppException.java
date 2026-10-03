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

    public String getCode() {
        return code;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
