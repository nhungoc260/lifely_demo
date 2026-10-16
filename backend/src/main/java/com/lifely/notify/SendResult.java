package com.lifely.notify;

/** Kết quả một lần gọi nhà cung cấp SMS. */
public record SendResult(boolean ok, boolean retryable, String providerMessageId, String errorCode) {

    public static SendResult ok(String providerMessageId) {
        return new SendResult(true, false, providerMessageId, null);
    }

    /** Lỗi tạm thời (timeout, 5xx): được thử lại có giới hạn. */
    public static SendResult retry(String errorCode) {
        return new SendResult(false, true, null, errorCode);
    }

    /** Lỗi vĩnh viễn (số không hợp lệ, bị từ chối): không thử lại. */
    public static SendResult fail(String errorCode) {
        return new SendResult(false, false, null, errorCode);
    }
}
