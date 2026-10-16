import com.lifely.push.WebPushCrypto;
import java.nio.charset.StandardCharsets;
import java.security.interfaces.ECPrivateKey;

public class Harness {
    public static void main(String[] a) throws Exception {
        if (a[0].equals("enc")) {   // enc <uaPub> <auth> <text>
            byte[] body = WebPushCrypto.encrypt(java.util.Base64.getDecoder().decode(a[3]), WebPushCrypto.b64urlDecode(a[1]), WebPushCrypto.b64urlDecode(a[2]));
            System.out.println(WebPushCrypto.b64url(body));
        } else {                    // vapid <priv> <pub> <aud> <sub>
            ECPrivateKey k = WebPushCrypto.decodePrivate(WebPushCrypto.b64urlDecode(a[1]));
            System.out.println(WebPushCrypto.vapidAuthorization(a[3], a[4], k, WebPushCrypto.b64urlDecode(a[2]), System.currentTimeMillis() / 1000 + 3600));
        }
    }
}
