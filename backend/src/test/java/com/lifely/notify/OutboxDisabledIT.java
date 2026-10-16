package com.lifely.notify;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/** Cấu hình mặc định: cả hai kênh TẮT => kể cả đã đồng ý cũng không có gì được xếp hàng. */
@SpringBootTest(properties = {"lifely.notify.worker-initial-delay-ms=3600000"})
class OutboxDisabledIT {

    @Autowired OutboxService outbox;
    @Autowired ConsentService consents;
    @Autowired JdbcTemplate jdbc;

    @Test
    void channelsDisabledByDefaultQueueNothing() {
        UUID user = jdbc.queryForObject("SELECT u.id FROM users u JOIN donor_profiles d ON d.user_id=u.id LIMIT 1", UUID.class);
        consents.update(user, new ConsentService.Update(null, true, true));
        assertFalse(outbox.enqueue(user, OutboxService.Channel.SMS, "APPT_REMINDER", "APPOINTMENT", UUID.randomUUID(), "x", "IT:OFF1"));
        assertFalse(outbox.enqueue(user, OutboxService.Channel.VOICE, "APPT_REMINDER", "APPOINTMENT", UUID.randomUUID(), "x", "IT:OFF2"));
        assertEquals(0, jdbc.queryForObject("SELECT count(*) FROM notification_outbox WHERE dedupe_key LIKE 'IT:OFF%'", Integer.class));
        consents.update(user, new ConsentService.Update(null, false, false));
    }
}
