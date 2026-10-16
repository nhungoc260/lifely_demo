package com.lifely.notify;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Cấu hình kênh SMS / cuộc gọi tự động (prefix lifely.notify). MẶC ĐỊNH TẮT cả hai kênh.
 * provider=mock: chỉ ghi log, không gửi tin nhắn hay gọi điện thật.
 */
@ConfigurationProperties(prefix = "lifely.notify")
@Getter
@Setter
public class NotifyProperties {

    private boolean smsEnabled = false;
    private boolean voiceEnabled = false;
    /** Web Push (VAPID). Cần thêm cặp khóa trong lifely.push.*; tắt mặc định. */
    private boolean pushEnabled = false;
    private int pushPerUserPerDay = 20;
    /** Hiện chỉ có "mock". Nhà cung cấp thật cần được cài đặt thêm bằng một bean SmsProvider / VoiceCallProvider. */
    private String provider = "mock";
    private int maxAttempts = 3;
    private int retryBaseSeconds = 30;
    private int batchSize = 20;
    /** Giới hạn tần suất theo người nhận mỗi 24 giờ (chống làm phiền / lạm dụng). */
    private int smsPerUserPerDay = 5;
    private int voicePerUserPerDay = 2;
    /** Bản ghi SENDING quá lâu (worker chết giữa chừng) được đưa về PENDING hoặc FAILED. */
    private int stuckAfterMinutes = 5;
    private int appointmentReminderHours = 24;
}
