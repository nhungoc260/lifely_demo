package com.lifely.notify;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

/** Quy tắc kết thúc một lần gửi: thành công, retry có giới hạn với backoff tăng dần, lỗi vĩnh viễn. */
class OutboxWorkerFinishTest {

    private FakeJdbc jdbc;
    private OutboxWorker worker;

    private static class NoopTx extends AbstractPlatformTransactionManager {
        @Override protected Object doGetTransaction() { return new Object(); }
        @Override protected void doBegin(Object t, org.springframework.transaction.TransactionDefinition d) { }
        @Override protected void doCommit(DefaultTransactionStatus s) { }
        @Override protected void doRollback(DefaultTransactionStatus s) { }
    }

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() {
        jdbc = new FakeJdbc();
        NotifyProperties props = new NotifyProperties();
        props.setRetryBaseSeconds(30);
        worker = new OutboxWorker(jdbc, new NoopTx(), props, mock(ObjectProvider.class),
                mock(com.lifely.push.PushService.class), mock(com.lifely.push.WebPushSender.class));
    }

    private OutboxWorker.Claimed claimed(int attempts, int max) {
        return new OutboxWorker.Claimed(UUID.randomUUID(), "SMS", UUID.randomUUID(), "REQUEST_INVITE", "REQUEST",
                UUID.randomUUID(), "body", attempts, max, "SMS:INVITE:x");
    }

    @Test
    void successMarksSent() {
        worker.finish(claimed(1, 3), SendResult.ok("msg-1"));
        assertTrue(jdbc.anyUpdateContains("status = 'SENT'"));
    }

    @Test
    void transientFailureRetriesWithExponentialBackoff() {
        worker.finish(claimed(1, 3), SendResult.retry("TIMEOUT"));
        assertTrue(jdbc.anyUpdateContains("status = 'PENDING'"));
        assertEquals(30L, jdbc.updateArgs.get(0)[1], "lần 1 chờ 30s");
        worker.finish(claimed(2, 3), SendResult.retry("TIMEOUT"));
        assertEquals(60L, jdbc.updateArgs.get(1)[1], "lần 2 chờ 60s");
    }

    @Test
    void retriesStopAtMaxAttempts() {
        worker.finish(claimed(3, 3), SendResult.retry("TIMEOUT"));
        assertTrue(jdbc.anyUpdateContains("status = 'FAILED'"));
        assertFalse(jdbc.anyUpdateContains("status = 'PENDING'"));
    }

    @Test
    void permanentFailureIsNotRetried() {
        worker.finish(claimed(1, 3), SendResult.fail("INVALID_NUMBER"));
        assertTrue(jdbc.anyUpdateContains("status = 'FAILED'"));
        assertFalse(jdbc.anyUpdateContains("status = 'PENDING'"));
    }
}
