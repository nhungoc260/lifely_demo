package com.lifely.push;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.interfaces.ECPrivateKey;
import java.time.Duration;

/** Gửi một Web Push tới một subscription. KHÔNG ghi log endpoint, khóa hay nội dung; chỉ ghi mã trạng thái. */
@Component
public class WebPushSender {

    public enum Outcome { OK, GONE, RETRY, FAIL }

    public record Result(Outcome outcome, int status) {
    }

    private static final Logger log = LoggerFactory.getLogger(WebPushSender.class);

    private final PushProperties props;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    private volatile ECPrivateKey privateKey;
    private volatile byte[] publicKey;
    private volatile boolean initTried;

    public WebPushSender(PushProperties props) {
        this.props = props;
    }

    /** Có đủ khóa hợp lệ để gửi chưa. */
    public synchronized boolean isConfigured() {
        if (!initTried) {
            initTried = true;
            if (props.hasKeys()) {
                try {
                    privateKey = WebPushCrypto.decodePrivate(WebPushCrypto.b64urlDecode(props.getPrivateKey()));
                    publicKey = WebPushCrypto.b64urlDecode(props.getPublicKey());
                    WebPushCrypto.decodePublic(publicKey);
                } catch (GeneralSecurityException | IllegalArgumentException e) {
                    privateKey = null;
                    log.warn("Khóa VAPID không hợp lệ; Web Push bị tắt");
                }
            }
        }
        return privateKey != null && publicKey != null;
    }

    public Result send(String endpoint, String p256dh, String auth, String payloadJson, String urgency) {
        if (!isConfigured()) {
            return new Result(Outcome.FAIL, 0);
        }
        try {
            byte[] body = WebPushCrypto.encrypt(payloadJson.getBytes(StandardCharsets.UTF_8),
                    WebPushCrypto.b64urlDecode(p256dh), WebPushCrypto.b64urlDecode(auth));
            URI uri = URI.create(endpoint);
            String audience = uri.getScheme() + "://" + uri.getAuthority();
            String authorization = WebPushCrypto.vapidAuthorization(audience, props.getSubject(), privateKey, publicKey,
                    System.currentTimeMillis() / 1000 + 12 * 3600);
            HttpRequest req = HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(10))
                    .header("Content-Encoding", "aes128gcm")
                    .header("Content-Type", "application/octet-stream")
                    .header("TTL", String.valueOf(props.getTtlSeconds()))
                    .header("Urgency", urgency == null ? "normal" : urgency)
                    .header("Authorization", authorization)
                    .POST(HttpRequest.BodyPublishers.ofByteArray(body)).build();
            int status = http.send(req, HttpResponse.BodyHandlers.discarding()).statusCode();
            Outcome o;
            if (status >= 200 && status < 300) {
                o = Outcome.OK;
            } else if (status == 404 || status == 410) {
                o = Outcome.GONE;          // subscription đã hết hạn / bị gỡ: xóa khỏi DB
            } else if (status == 429 || status >= 500) {
                o = Outcome.RETRY;
            } else {
                o = Outcome.FAIL;
            }
            log.debug("Web Push status={} outcome={}", status, o);
            return new Result(o, status);
        } catch (IOException e) {
            return new Result(Outcome.RETRY, 0);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return new Result(Outcome.RETRY, 0);
        } catch (GeneralSecurityException | IllegalArgumentException e) {
            return new Result(Outcome.FAIL, 0);
        }
    }
}
