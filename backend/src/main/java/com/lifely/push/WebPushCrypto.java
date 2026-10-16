package com.lifely.push;

import javax.crypto.Cipher;
import javax.crypto.KeyAgreement;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.ByteArrayOutputStream;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.AlgorithmParameters;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.SecureRandom;
import java.security.Signature;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.ECParameterSpec;
import java.security.spec.ECPoint;
import java.security.spec.ECPrivateKeySpec;
import java.security.spec.ECPublicKeySpec;
import java.util.Arrays;
import java.util.Base64;

/**
 * Mã hóa nội dung Web Push theo RFC 8291 (aes128gcm) và ký VAPID (RFC 8292, ES256) chỉ bằng JDK, không thêm thư viện.
 * Lớp thuần Java: không phụ thuộc Spring để kiểm thử độc lập. Không ghi log bất kỳ khóa hay dữ liệu nào.
 */
public final class WebPushCrypto {

    private static final SecureRandom RNG = new SecureRandom();
    private static final int RECORD_SIZE = 4096;
    /** Một bản ghi duy nhất: 4096 - 16 (tag) - 1 (delimiter) - 86 (header) = 3993 byte tối đa. */
    public static final int MAX_PAYLOAD = 3993;

    private WebPushCrypto() {
    }

    // ------------------------------------------------------------------ khóa

    public static KeyPair generateKeyPair() throws GeneralSecurityException {
        KeyPairGenerator g = KeyPairGenerator.getInstance("EC");
        g.initialize(new ECGenParameterSpec("secp256r1"));
        return g.generateKeyPair();
    }

    private static ECParameterSpec curve() throws GeneralSecurityException {
        AlgorithmParameters ap = AlgorithmParameters.getInstance("EC");
        ap.init(new ECGenParameterSpec("secp256r1"));
        return ap.getParameterSpec(ECParameterSpec.class);
    }

    /** Điểm công khai dạng không nén: 0x04 || X(32) || Y(32) = 65 byte. */
    public static byte[] encodePublic(ECPublicKey key) {
        byte[] out = new byte[65];
        out[0] = 0x04;
        System.arraycopy(fixed32(key.getW().getAffineX()), 0, out, 1, 32);
        System.arraycopy(fixed32(key.getW().getAffineY()), 0, out, 33, 32);
        return out;
    }

    public static ECPublicKey decodePublic(byte[] p65) throws GeneralSecurityException {
        if (p65 == null || p65.length != 65 || p65[0] != 0x04) {
            throw new GeneralSecurityException("Khóa công khai P-256 không hợp lệ");
        }
        BigInteger x = new BigInteger(1, Arrays.copyOfRange(p65, 1, 33));
        BigInteger y = new BigInteger(1, Arrays.copyOfRange(p65, 33, 65));
        return (ECPublicKey) KeyFactory.getInstance("EC").generatePublic(new ECPublicKeySpec(new ECPoint(x, y), curve()));
    }

    /** Khóa riêng VAPID: số nguyên 32 byte (định dạng base64url mà `web-push generate-vapid-keys` cho ra). */
    public static ECPrivateKey decodePrivate(byte[] d32) throws GeneralSecurityException {
        return (ECPrivateKey) KeyFactory.getInstance("EC").generatePrivate(new ECPrivateKeySpec(new BigInteger(1, d32), curve()));
    }

    public static byte[] b64urlDecode(String s) {
        return Base64.getUrlDecoder().decode(s.replace('+', '-').replace('/', '_').replace("=", ""));
    }

    public static String b64url(byte[] b) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(b);
    }

    // ------------------------------------------------------------------ RFC 8291

    /** Mã hóa với khóa tạm và salt ngẫu nhiên. Trả về toàn bộ body (header + ciphertext). */
    public static byte[] encrypt(byte[] payload, byte[] uaPublic65, byte[] authSecret16) throws GeneralSecurityException {
        byte[] salt = new byte[16];
        RNG.nextBytes(salt);
        return encrypt(payload, uaPublic65, authSecret16, generateKeyPair(), salt);
    }

    /** Dạng tất định (khóa tạm và salt cho trước) để kiểm thử. */
    public static byte[] encrypt(byte[] payload, byte[] uaPublic65, byte[] authSecret16, KeyPair as, byte[] salt)
            throws GeneralSecurityException {
        if (payload.length > MAX_PAYLOAD) {
            throw new IllegalArgumentException("Nội dung push quá dài (" + payload.length + " > " + MAX_PAYLOAD + ")");
        }
        if (authSecret16 == null || authSecret16.length != 16 || salt.length != 16) {
            throw new IllegalArgumentException("auth secret và salt phải 16 byte");
        }
        ECPublicKey ua = decodePublic(uaPublic65);
        byte[] asPublic = encodePublic((ECPublicKey) as.getPublic());

        KeyAgreement ka = KeyAgreement.getInstance("ECDH");
        ka.init(as.getPrivate());
        ka.doPhase(ua, true);
        byte[] ecdh = ka.generateSecret();

        byte[] prkKey = hmac(authSecret16, ecdh);
        byte[] keyInfo = concat("WebPush: info\0".getBytes(StandardCharsets.US_ASCII), uaPublic65, asPublic);
        byte[] ikm = hkdfExpand(prkKey, keyInfo, 32);
        byte[] prk = hmac(salt, ikm);
        byte[] cek = hkdfExpand(prk, "Content-Encoding: aes128gcm\0".getBytes(StandardCharsets.US_ASCII), 16);
        byte[] nonce = hkdfExpand(prk, "Content-Encoding: nonce\0".getBytes(StandardCharsets.US_ASCII), 12);

        byte[] plain = new byte[payload.length + 1];
        System.arraycopy(payload, 0, plain, 0, payload.length);
        plain[payload.length] = 0x02;   // delimiter của bản ghi cuối

        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
        c.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(cek, "AES"), new GCMParameterSpec(128, nonce));
        byte[] cipher = c.doFinal(plain);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.writeBytes(salt);
        out.writeBytes(new byte[]{(byte) (RECORD_SIZE >>> 24), (byte) (RECORD_SIZE >>> 16), (byte) (RECORD_SIZE >>> 8), (byte) RECORD_SIZE});
        out.write(asPublic.length);
        out.writeBytes(asPublic);
        out.writeBytes(cipher);
        return out.toByteArray();
    }

    // ------------------------------------------------------------------ VAPID (RFC 8292)

    /** Giá trị header Authorization: "vapid t=<jwt>, k=<khóa công khai base64url>". */
    public static String vapidAuthorization(String audience, String subject, ECPrivateKey priv, byte[] pub65, long expEpochSeconds)
            throws GeneralSecurityException {
        String header = b64url("{\"typ\":\"JWT\",\"alg\":\"ES256\"}".getBytes(StandardCharsets.UTF_8));
        String claims = b64url(("{\"aud\":\"" + esc(audience) + "\",\"exp\":" + expEpochSeconds + ",\"sub\":\"" + esc(subject) + "\"}")
                .getBytes(StandardCharsets.UTF_8));
        String signingInput = header + "." + claims;
        Signature s = Signature.getInstance("SHA256withECDSA");
        s.initSign(priv);
        s.update(signingInput.getBytes(StandardCharsets.US_ASCII));
        String jwt = signingInput + "." + b64url(derToRaw(s.sign()));
        return "vapid t=" + jwt + ", k=" + b64url(pub65);
    }

    /** DER (SEQUENCE{INTEGER r, INTEGER s}) -> r||s mỗi số 32 byte, đúng định dạng JWS ES256. */
    static byte[] derToRaw(byte[] der) throws GeneralSecurityException {
        int i = 0;
        if (der[i++] != 0x30) throw new GeneralSecurityException("DER không hợp lệ");
        int len = der[i++] & 0xff;
        if (len == 0x81) i++; else if (len > 0x81) throw new GeneralSecurityException("DER không hợp lệ");
        if (der[i++] != 0x02) throw new GeneralSecurityException("DER không hợp lệ");
        int rl = der[i++] & 0xff;
        byte[] r = Arrays.copyOfRange(der, i, i + rl);
        i += rl;
        if (der[i++] != 0x02) throw new GeneralSecurityException("DER không hợp lệ");
        int sl = der[i++] & 0xff;
        byte[] s = Arrays.copyOfRange(der, i, i + sl);
        return concat(fixed32(new BigInteger(1, r)), fixed32(new BigInteger(1, s)));
    }

    // ------------------------------------------------------------------ helper

    private static byte[] hmac(byte[] key, byte[] data) throws GeneralSecurityException {
        Mac m = Mac.getInstance("HmacSHA256");
        m.init(new SecretKeySpec(key.length == 0 ? new byte[32] : key, "HmacSHA256"));
        return m.doFinal(data);
    }

    /** HKDF-Expand một khối (đủ cho độ dài <= 32). */
    private static byte[] hkdfExpand(byte[] prk, byte[] info, int length) throws GeneralSecurityException {
        byte[] t = hmac(prk, concat(info, new byte[]{0x01}));
        return Arrays.copyOf(t, length);
    }

    private static byte[] fixed32(BigInteger v) {
        byte[] raw = v.toByteArray();
        byte[] out = new byte[32];
        if (raw.length > 32) {
            System.arraycopy(raw, raw.length - 32, out, 0, 32);
        } else {
            System.arraycopy(raw, 0, out, 32 - raw.length, raw.length);
        }
        return out;
    }

    private static byte[] concat(byte[]... parts) {
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        for (byte[] p : parts) o.writeBytes(p);
        return o.toByteArray();
    }

    private static String esc(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
