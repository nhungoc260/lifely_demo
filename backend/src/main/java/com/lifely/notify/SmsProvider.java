package com.lifely.notify;

/** Adapter nhà cung cấp SMS. Triển khai thật là một bean riêng; mặc định dùng {@link MockSmsProvider}. */
public interface SmsProvider {

    /** @param idempotencyKey khóa chống gửi trùng; chỉ có tác dụng nếu nhà cung cấp hỗ trợ. */
    SendResult send(String toPhone, String message, String idempotencyKey);
}
