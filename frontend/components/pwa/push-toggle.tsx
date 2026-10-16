"use client";

import { BellRing, Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { toApiError } from "@/lib/api";
import { PUSH_REASON_TEXT, pushSupport, urlBase64ToUint8Array, type PushSupport } from "@/lib/push";
import { pushApi } from "@/services";

type State = "loading" | "off" | "on" | "server-off";

/** Bật/tắt thông báo đẩy (Web Push) cho thiết bị này. Việc đăng ký thiết bị chính là sự đồng ý nhận kênh này. */
export function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [support, setSupport] = useState<PushSupport>({ ok: true });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
      const s = pushSupport({
        userAgent: navigator.userAgent, hasServiceWorker: "serviceWorker" in navigator, hasPushManager: "PushManager" in window,
        hasNotification: "Notification" in window, standalone, permission: "Notification" in window ? Notification.permission : "unsupported",
      });
      try {
        const cfg = await pushApi.config();
        if (!alive) return;
        setSupport(s);
        if (!cfg.enabled) return setState("server-off");
        if (!s.ok) return setState("off");
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        setState(sub && cfg.subscribed ? "on" : "off");
      } catch {
        if (alive) { setSupport(s); setState("off"); }
      }
    })();
    return () => { alive = false; };
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const cfg = await pushApi.config();
      if (!cfg.enabled) { setState("server-off"); return; }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setSupport({ ok: false, reason: "denied" }); toast.error(PUSH_REASON_TEXT.denied); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({
        userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(cfg.publicKey),
      }));
      const json = sub.toJSON();
      await pushApi.subscribe({ endpoint: sub.endpoint, keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" } });
      setState("on");
      toast.success("Đã bật thông báo đẩy trên thiết bị này");
    } catch (e) { toast.error(toApiError(e).message); } finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) { await pushApi.unsubscribe(sub.endpoint); await sub.unsubscribe(); }
      setState("off");
      toast.success("Đã tắt thông báo đẩy trên thiết bị này");
    } catch (e) { toast.error(toApiError(e).message); } finally { setBusy(false); }
  }

  async function sendTest() {
    setBusy(true);
    try { const r = await pushApi.test(); toast[r.queued ? "success" : "error"](r.queued ? "Đã gửi thông báo thử, vài giây nữa sẽ hiện lên" : "Chưa thể gửi thông báo thử"); }
    catch (e) { toast.error(toApiError(e).message); } finally { setBusy(false); }
  }

  const hint = state === "server-off" ? "Máy chủ chưa bật thông báo đẩy. Bạn vẫn nhận thông báo trong ứng dụng."
    : !support.ok ? PUSH_REASON_TEXT[support.reason]
    : state === "on" ? "Thiết bị này sẽ nhận yêu cầu máu gần bạn và nhắc lịch ngay cả khi không mở ứng dụng."
    : "Nhận thông báo tức thì trên điện thoại khi có yêu cầu máu gần bạn.";

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="flex items-center gap-2 text-sm font-medium"><BellRing className="size-4" aria-hidden />Thông báo đẩy trên thiết bị này</p>
        <p className="text-xs text-muted-foreground" aria-live="polite">{hint}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        {state === "on" && <Button size="sm" variant="outline" onClick={sendTest} disabled={busy}><Send /> Gửi thử</Button>}
        {state === "on" ? <Button size="sm" variant="outline" onClick={disable} disabled={busy}>{busy && <Loader2 className="animate-spin" />} Tắt</Button>
          : <Button size="sm" onClick={enable} disabled={busy || state === "loading" || state === "server-off" || (!support.ok && support.reason !== "denied")}>{busy && <Loader2 className="animate-spin" />} Bật</Button>}
      </div>
    </div>
  );
}
