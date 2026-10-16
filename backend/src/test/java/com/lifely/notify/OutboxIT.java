package com.lifely.notify;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Outbox SMS/Voice ở chế độ MOCK (không gửi thật): đồng ý, chống trùng, retry có giới hạn, dừng khi yêu cầu đóng.
 * Cần PostgreSQL local có dữ liệu demo.   Chạy:  mvn test -Dtest=OutboxIT
 */
@SpringBootTest(properties = {
        "lifely.notify.sms-enabled=true", "lifely.notify.voice-enabled=true", "lifely.notify.provider=mock",
        "lifely.notify.retry-base-seconds=0", "lifely.notify.worker-initial-delay-ms=3600000",
        "lifely.notify.sms-per-user-per-day=1000"})
class OutboxIT {

    @Autowired OutboxService outbox;
    @Autowired OutboxWorker worker;
    @Autowired ConsentService consents;
    @Autowired JdbcTemplate jdbc;
    @Autowired SmsProvider sms;
    @Autowired VoiceCallProvider voice;

    UUID user;

    @BeforeEach
    void setUp() {
        user = jdbc.queryForObject("SELECT u.id FROM users u JOIN donor_profiles d ON d.user_id=u.id WHERE u.status='ACTIVE' LIMIT 1", UUID.class);
        jdbc.update("DELETE FROM notification_outbox WHERE dedupe_key LIKE 'IT:%'");
        jdbc.update("DELETE FROM notification_consents WHERE user_id=?", user);
        ((MockSmsProvider) sms).clear();
        ((MockVoiceProvider) voice).clear();
    }

    private void consent(boolean sms) {
        consents.update(user, new ConsentService.Update(null, sms, null));
    }

    private String status(String key) {
        return jdbc.queryForObject("SELECT status FROM notification_outbox WHERE dedupe_key=?", String.class, key);
    }

    @Test
    void providersAreMocksSoNothingRealIsSent() {
        assertInstanceOf(MockSmsProvider.class, sms);
        assertInstanceOf(MockVoiceProvider.class, voice);
    }

    @Test
    void noSmsWithoutConsentAndRevokingCancelsPending() {
        assertFalse(outbox.enqueue(user, OutboxService.Channel.SMS, "APPT_REMINDER", "APPOINTMENT", UUID.randomUUID(), "x", "IT:1"));
        consent(true);
        assertTrue(outbox.enqueue(user, OutboxService.Channel.SMS, "APPT_REMINDER", "APPOINTMENT", UUID.randomUUID(), "x", "IT:2"));
        consent(false);
        assertEquals("CANCELLED", status("IT:2"));
        worker.runOnce();
        assertTrue(((MockSmsProvider) sms).sent().isEmpty(), "rút đồng ý thì không gửi");
    }

    @Test
    void sameEventIsQueuedAndSentOnlyOnce() {
        consent(true);
        UUID ref = UUID.randomUUID();
        assertTrue(outbox.enqueue(user, OutboxService.Channel.SMS, "APPT_REMINDER", "APPOINTMENT", ref, "x", "IT:3"));
        assertFalse(outbox.enqueue(user, OutboxService.Channel.SMS, "APPT_REMINDER", "APPOINTMENT", ref, "x", "IT:3"), "xử lý lại cùng sự kiện không tạo thêm");
        worker.runOnce();
        worker.runOnce();
        assertEquals("SENT", status("IT:3"));
        assertEquals(1, ((MockSmsProvider) sms).sent().size(), "chỉ một tin được gửi");
    }

    @Test
    void providerTimeoutRetriesThenFailsAtLimit() {
        consent(true);
        outbox.enqueue(user, OutboxService.Channel.SMS, "APPT_REMINDER", "APPOINTMENT", UUID.randomUUID(), "x", "IT:4");
        ((MockSmsProvider) sms).forceResult(SendResult.retry("TIMEOUT"));
        worker.runOnce();
        assertEquals("PENDING", status("IT:4"), "lỗi tạm thời: xếp lại");
        worker.runOnce();
        worker.runOnce();
        assertEquals("FAILED", status("IT:4"), "hết số lần thử thì dừng");
        assertEquals(3, jdbc.queryForObject("SELECT attempts FROM notification_outbox WHERE dedupe_key='IT:4'", Integer.class));
        ((MockSmsProvider) sms).forceResult(null);
        worker.runOnce();
        assertEquals("FAILED", status("IT:4"), "FAILED không tự gửi lại");
    }

    @Test
    void invitesStopWhenRequestIsClosed() {
        consent(true);
        UUID requester = jdbc.queryForObject("SELECT id FROM users WHERE email='requester@lifely.demo'", UUID.class);
        UUID req = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO blood_requests (id, requester_id, blood_type_id, units_required, units_confirmed, urgency, status,
                  hospital_name, city, latitude, longitude, deadline, contact_phone, verified, verified_by)
                VALUES (?, ?, 1, 2, 0, 'URGENT', 'DONORS_CONTACTED', 'Outbox Test Hospital', 'HCMC', 10.77, 106.70,
                        now() + interval '2 hours', '0901234567', TRUE, ?)
                """, req, requester, requester);
        outbox.enqueue(user, OutboxService.Channel.SMS, OutboxService.PURPOSE_INVITE, "REQUEST", req, "x", "IT:5");
        // Yêu cầu bị đóng mà chưa ai gọi cancelPending: worker vẫn phải kiểm tra lại ngay trước khi gửi.
        jdbc.update("UPDATE blood_requests SET status='CANCELLED' WHERE id=?", req);
        worker.runOnce();
        assertEquals("CANCELLED", status("IT:5"));
        assertEquals("REQUEST_CLOSED", jdbc.queryForObject("SELECT last_error_code FROM notification_outbox WHERE dedupe_key='IT:5'", String.class));
        assertTrue(((MockSmsProvider) sms).sent().isEmpty());
        jdbc.update("DELETE FROM notification_outbox WHERE reference_id=?", req);
        jdbc.update("DELETE FROM request_status_history WHERE request_id=?", req);
        jdbc.update("DELETE FROM blood_requests WHERE id=?", req);
    }
}
