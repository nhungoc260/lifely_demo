package com.lifely.notify;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/** Giả lập SMS: KHÔNG gửi gì ra ngoài. Chỉ ghi log (số điện thoại được che) và lưu bộ nhớ để kiểm thử. */
@Component
@ConditionalOnProperty(name = "lifely.notify.provider", havingValue = "mock", matchIfMissing = true)
public class MockSmsProvider implements SmsProvider {

    private static final Logger log = LoggerFactory.getLogger(MockSmsProvider.class);

    public record Sent(String maskedPhone, String message, String idempotencyKey) {
    }

    private final List<Sent> sent = new CopyOnWriteArrayList<>();
    private volatile SendResult forced;

    @Override
    public SendResult send(String toPhone, String message, String idempotencyKey) {
        if (forced != null) {
            return forced;
        }
        sent.add(new Sent(mask(toPhone), message, idempotencyKey));
        log.info("[MOCK SMS] -> {} ({} ký tự) key={}", mask(toPhone), message.length(), idempotencyKey);
        return SendResult.ok("mock-sms-" + sent.size());
    }

    /** Dùng trong test để mô phỏng lỗi/timeout của nhà cung cấp. null = hoạt động bình thường. */
    public void forceResult(SendResult result) {
        this.forced = result;
    }

    public List<Sent> sent() {
        return sent;
    }

    public void clear() {
        sent.clear();
        forced = null;
    }

    static String mask(String phone) {
        if (phone == null || phone.length() < 4) {
            return "***";
        }
        return "*******" + phone.substring(phone.length() - 3);
    }
}
