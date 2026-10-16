import com.lifely.push.*;
public class SenderProbe {
  public static void main(String[] a) {   // endpoint p256dh auth vapidPub vapidPriv payloadB64
    PushProperties p = new PushProperties(); p.publicKey = a[3]; p.privateKey = a[4]; p.subject = "mailto:demo@example.invalid";
    WebPushSender s = new WebPushSender(p);
    String payload = new String(java.util.Base64.getDecoder().decode(a[5]), java.nio.charset.StandardCharsets.UTF_8);
    WebPushSender.Result r = s.send(a[0], a[1], a[2], payload, "high");
    System.out.println(r.outcome() + " " + r.status() + " configured=" + s.isConfigured());
  }
}
