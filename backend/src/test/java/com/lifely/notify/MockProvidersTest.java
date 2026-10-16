package com.lifely.notify;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/** Mock mode không gửi ra ngoài và không lộ số điện thoại đầy đủ. */
class MockProvidersTest {

    @Test
    void smsMockRecordsMaskedPhoneOnly() {
        MockSmsProvider p = new MockSmsProvider();
        SendResult r = p.send("0901234567", "nội dung", "k1");
        assertTrue(r.ok());
        assertEquals(1, p.sent().size());
        assertFalse(p.sent().get(0).maskedPhone().contains("0901234"), "không lưu số đầy đủ");
        assertTrue(p.sent().get(0).maskedPhone().endsWith("567"));
    }

    @Test
    void forcedFailureSimulatesProviderTimeout() {
        MockSmsProvider p = new MockSmsProvider();
        p.forceResult(SendResult.retry("TIMEOUT"));
        SendResult r = p.send("0901234567", "x", "k");
        assertFalse(r.ok());
        assertTrue(r.retryable());
        assertTrue(p.sent().isEmpty());
    }
}
