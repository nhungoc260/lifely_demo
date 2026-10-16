package com.lifely.notify;

/** Adapter nhà cung cấp cuộc gọi tự động. Mặc định dùng {@link MockVoiceProvider}. */
public interface VoiceCallProvider {

    SendResult call(String toPhone, String script, String idempotencyKey);
}
