package com.lifely.auth;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

class LoginThrottleTest {

    @Test
    void locksOnlyTheSameEmailAndIpAfterFiveFailures() {
        LoginThrottle t = new LoginThrottle();
        Instant now = Instant.parse("2026-01-01T00:00:00Z");
        for (int i = 0; i < LoginThrottle.MAX_FAILURES; i++) t.recordFailure("a@x.vn|1.1.1.1", now);
        assertTrue(t.isLocked("a@x.vn|1.1.1.1", now.plusSeconds(1)));
        assertFalse(t.isLocked("a@x.vn|2.2.2.2", now.plusSeconds(1)), "người dùng thật ở IP khác không bị khóa");
        assertFalse(t.isLocked("b@x.vn|1.1.1.1", now.plusSeconds(1)));
    }

    @Test
    void lockExpiresAndSuccessClearsCounter() {
        LoginThrottle t = new LoginThrottle();
        Instant now = Instant.parse("2026-01-01T00:00:00Z");
        for (int i = 0; i < LoginThrottle.MAX_FAILURES; i++) t.recordFailure("k", now);
        assertFalse(t.isLocked("k", now.plus(LoginThrottle.LOCK).plusSeconds(1)));
        t.recordFailure("k2", now);
        t.clear("k2");
        for (int i = 0; i < LoginThrottle.MAX_FAILURES - 1; i++) t.recordFailure("k2", now);
        assertFalse(t.isLocked("k2", now));
    }

    @Test
    void clientIpIgnoresForwardedHeaderWhenNoTrustedProxy() {
        MockHttpServletRequest r = new MockHttpServletRequest();
        r.setRemoteAddr("10.0.0.1");
        r.addHeader("X-Forwarded-For", "6.6.6.6");
        assertEquals("10.0.0.1", new ClientIp(0).resolve(r));
    }

    @Test
    void clientIpTakesEntryCountedFromTheRightByHops() {
        MockHttpServletRequest r = new MockHttpServletRequest();
        r.setRemoteAddr("10.0.0.1");
        r.addHeader("X-Forwarded-For", "6.6.6.6, 203.0.113.9, 76.76.21.21");
        assertEquals("203.0.113.9", new ClientIp(2).resolve(r));
        assertEquals("76.76.21.21", new ClientIp(1).resolve(r));
    }
}
