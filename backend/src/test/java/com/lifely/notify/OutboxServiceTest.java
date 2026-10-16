package com.lifely.notify;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class OutboxServiceTest {

    private FakeJdbc jdbc;
    private NotifyProperties props;
    private OutboxService service;
    private final UUID user = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        jdbc = new FakeJdbc();
        props = new NotifyProperties();
        service = new OutboxService(jdbc, props, "https://lifely.example");
    }

    @Test
    void channelsAreOffByDefault() {
        assertFalse(props.isSmsEnabled());
        assertEquals("mock", props.getProvider());
    }

    @Test
    void disabledChannelNeverQueues() {
        assertFalse(service.enqueue(user, OutboxService.Channel.SMS, "REQUEST_INVITE", "REQUEST", UUID.randomUUID(), "x", "k"));
        assertTrue(jdbc.updates.isEmpty(), "kênh tắt thì không được ghi gì vào outbox");
    }

    @Test
    void noConsentNeverQueues() {
        props.setSmsEnabled(true);
        jdbc.consentCount = 0;
        assertFalse(service.enqueue(user, OutboxService.Channel.SMS, "REQUEST_INVITE", "REQUEST", UUID.randomUUID(), "x", "k"));
        assertTrue(jdbc.updates.isEmpty(), "chưa đồng ý thì không được xếp hàng");
    }

    @Test
    void enabledAndConsentedQueuesOnceAndDuplicateKeyIsIgnored() {
        props.setSmsEnabled(true);
        assertTrue(service.enqueue(user, OutboxService.Channel.SMS, "REQUEST_INVITE", "REQUEST", UUID.randomUUID(), "x", "k"));
        assertTrue(jdbc.anyUpdateContains("ON CONFLICT (dedupe_key) DO NOTHING"));
        jdbc.updateResult = 0;   // DB báo đã có dedupe_key này
        assertFalse(service.enqueue(user, OutboxService.Channel.SMS, "REQUEST_INVITE", "REQUEST", UUID.randomUUID(), "x", "k"));
    }

    @Test
    void messageTemplatesDoNotClaimEligibilityOrStock() {
        String sms = service.inviteSms("O+", "Bệnh viện A");
        for (String t : new String[]{sms}) {
            assertTrue(t.contains("không") || t.contains("chỉ hỗ trợ điều phối"), "phải có lưu ý điều phối");
            assertTrue(t.contains("cơ sở y tế quyết định"));
            assertFalse(t.toLowerCase().contains("đã có máu"));
            assertFalse(t.toLowerCase().contains("chắc chắn"));
        }
        assertTrue(sms.contains("https://lifely.example/donor/requests"));
        assertTrue(sms.length() < 480);
    }

    @Test
    void revokingOrClosingCancelsOnlyPending() {
        service.cancelPending("REQUEST", UUID.randomUUID(), null);
        service.cancelPendingForUser(user, OutboxService.Channel.SMS);
        assertTrue(jdbc.updates.stream().allMatch(u -> u.contains("status = 'PENDING'")),
                "chỉ hủy tin chưa gửi, không đụng tin đã SENT/SENDING");
    }

    @Test
    void noAutomatedVoiceChannelExists() {
        for (OutboxService.Channel c : OutboxService.Channel.values()) {
            assertNotEquals("VOICE", c.name(), "LIFELY không có cuộc gọi tự động");
        }
    }

    @Test
    void pushPayloadIsValidEscapedJson() {
        String j = OutboxService.pushPayload("Nhắc \"hiến\" máu", "Dòng 1\nDòng 2", "/donor/health");
        assertTrue(j.startsWith("{\"title\":\"Nhắc \\\"hiến\\\" máu\""));
        assertTrue(j.contains("Dòng 1\\nDòng 2"));
        assertTrue(j.endsWith("\"url\":\"/donor/health\"}"));
    }

    @Test
    void pushIsOffByDefaultAndNeedsConsent() {
        assertFalse(props.isPushEnabled());
        assertFalse(service.enqueuePush(user, "REJOIN_REMINDER", "DONOR", UUID.randomUUID(), "t", "b", "/x", "k"));
        assertTrue(jdbc.updates.isEmpty());
        props.setPushEnabled(true);
        jdbc.consentCount = 0;   // chưa đăng ký thiết bị = chưa đồng ý
        assertFalse(service.enqueuePush(user, "REJOIN_REMINDER", "DONOR", UUID.randomUUID(), "t", "b", "/x", "k"));
        jdbc.consentCount = 1;
        assertTrue(service.enqueuePush(user, "REJOIN_REMINDER", "DONOR", UUID.randomUUID(), "t", "b", "/x", "k"));
    }
}
