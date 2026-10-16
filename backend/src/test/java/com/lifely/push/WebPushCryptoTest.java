package com.lifely.push;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Kiểm tra cấu trúc và tính nhất quán. Việc giải mã đúng chuẩn đã được kiểm chứng riêng bằng thư viện tham chiếu
 * http_ece của Node (xem tools/push-verify/ và docs/UPGRADE_REPORT.md).
 */
class WebPushCryptoTest {

    @Test
    void publicKeyEncodingRoundTrips() throws Exception {
        KeyPair kp = WebPushCrypto.generateKeyPair();
        byte[] enc = WebPushCrypto.encodePublic((ECPublicKey) kp.getPublic());
        assertEquals(65, enc.length);
        assertEquals(0x04, enc[0]);
        ECPublicKey back = WebPushCrypto.decodePublic(enc);
        assertArrayEquals(enc, WebPushCrypto.encodePublic(back));
        assertThrows(Exception.class, () -> WebPushCrypto.decodePublic(new byte[65]));
    }

    @Test
    void encryptedBodyHasRfc8291Header() throws Exception {
        KeyPair ua = WebPushCrypto.generateKeyPair();
        byte[] uaPub = WebPushCrypto.encodePublic((ECPublicKey) ua.getPublic());
        byte[] body = WebPushCrypto.encrypt("Xin chào".getBytes(StandardCharsets.UTF_8), uaPub, new byte[16]);
        assertEquals(16 + 4 + 1 + 65 + ("Xin chào".getBytes(StandardCharsets.UTF_8).length + 1 + 16), body.length);
        assertEquals(4096, ((body[16] & 0xff) << 24) | ((body[17] & 0xff) << 16) | ((body[18] & 0xff) << 8) | (body[19] & 0xff));
        assertEquals(65, body[20] & 0xff);
        assertEquals(0x04, body[21]);
    }

    @Test
    void sameInputGivesDifferentCiphertextBecauseOfRandomSaltAndKey() throws Exception {
        KeyPair ua = WebPushCrypto.generateKeyPair();
        byte[] uaPub = WebPushCrypto.encodePublic((ECPublicKey) ua.getPublic());
        byte[] a = WebPushCrypto.encrypt("x".getBytes(), uaPub, new byte[16]);
        byte[] b = WebPushCrypto.encrypt("x".getBytes(), uaPub, new byte[16]);
        assertFalse(java.util.Arrays.equals(a, b));
    }

    @Test
    void payloadLimitIsEnforced() throws Exception {
        KeyPair ua = WebPushCrypto.generateKeyPair();
        byte[] uaPub = WebPushCrypto.encodePublic((ECPublicKey) ua.getPublic());
        assertNotNull(WebPushCrypto.encrypt(new byte[WebPushCrypto.MAX_PAYLOAD], uaPub, new byte[16]));
        assertThrows(IllegalArgumentException.class, () -> WebPushCrypto.encrypt(new byte[WebPushCrypto.MAX_PAYLOAD + 1], uaPub, new byte[16]));
        assertThrows(IllegalArgumentException.class, () -> WebPushCrypto.encrypt(new byte[1], uaPub, new byte[15]));
    }

    @Test
    void vapidHeaderHasRawSignatureOf64Bytes() throws Exception {
        KeyPair vapid = WebPushCrypto.generateKeyPair();
        String h = WebPushCrypto.vapidAuthorization("https://fcm.googleapis.com", "mailto:a@b.c",
                (ECPrivateKey) vapid.getPrivate(), WebPushCrypto.encodePublic((ECPublicKey) vapid.getPublic()), 4_000_000_000L);
        assertTrue(h.startsWith("vapid t="));
        String jwt = h.substring("vapid t=".length(), h.indexOf(','));
        assertEquals(64, WebPushCrypto.b64urlDecode(jwt.split("\\.")[2]).length);
    }
}
