package com.lifely.notify;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/** Giả lập cuộc gọi tự động: KHÔNG gọi điện thật. */
@Component
@ConditionalOnProperty(name = "lifely.notify.provider", havingValue = "mock", matchIfMissing = true)
public class MockVoiceProvider implements VoiceCallProvider {

    private static final Logger log = LoggerFactory.getLogger(MockVoiceProvider.class);

    public record Called(String maskedPhone, String script, String idempotencyKey) {
    }

    private final List<Called> calls = new CopyOnWriteArrayList<>();
    private volatile SendResult forced;

    @Override
    public SendResult call(String toPhone, String script, String idempotencyKey) {
        if (forced != null) {
            return forced;
        }
        calls.add(new Called(MockSmsProvider.mask(toPhone), script, idempotencyKey));
        log.info("[MOCK VOICE] -> {} key={}", MockSmsProvider.mask(toPhone), idempotencyKey);
        return SendResult.ok("mock-call-" + calls.size());
    }

    public void forceResult(SendResult result) {
        this.forced = result;
    }

    public List<Called> calls() {
        return calls;
    }

    public void clear() {
        calls.clear();
        forced = null;
    }
}
