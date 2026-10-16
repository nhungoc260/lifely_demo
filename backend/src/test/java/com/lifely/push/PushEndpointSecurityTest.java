package com.lifely.push;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.*;

/** Chống SSRF: server chỉ gửi tới dịch vụ push đã biết, qua https. */
class PushEndpointSecurityTest {

    private PushProperties props;
    private PushService service;

    @BeforeEach
    void setUp() {
        props = new PushProperties();
        service = new PushService(new JdbcTemplate(), props, null);
    }

    @Test
    void knownPushServicesOverHttpsAreAllowed() {
        assertTrue(service.endpointAllowed("https://fcm.googleapis.com/fcm/send/abc"));
        assertTrue(service.endpointAllowed("https://updates.push.services.mozilla.com/wpush/v2/abc"));
        assertTrue(service.endpointAllowed("https://web.push.apple.com/abc"));
        assertTrue(service.endpointAllowed("https://wns2-par02p.notify.windows.com/w/?token=abc"));
    }

    @Test
    void internalAndArbitraryHostsAreRejected() {
        for (String bad : new String[]{
                "https://evil.example.com/x", "http://fcm.googleapis.com/x", "https://localhost/x", "https://127.0.0.1/x",
                "https://169.254.169.254/latest/meta-data", "https://10.0.0.5/x", "https://fcm.googleapis.com.evil.com/x",
                "https://user:pw@fcm.googleapis.com/x", "ftp://fcm.googleapis.com/x", "not a url", "", "https://notfcm.googleapis.com.attacker.io"}) {
            assertFalse(service.endpointAllowed(bad), bad);
        }
    }

    @Test
    void localhostHttpOnlyWhenTestFlagIsOn() {
        assertFalse(service.endpointAllowed("http://127.0.0.1:8080/x"));
        props.setAllowInsecureLocalhost(true);
        assertTrue(service.endpointAllowed("http://127.0.0.1:8080/x"));
        assertFalse(service.endpointAllowed("http://evil.example.com/x"));
    }
}
