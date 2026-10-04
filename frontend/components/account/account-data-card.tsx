"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Download, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { API_URL, toApiError } from "@/lib/api";
import { tokenStore } from "@/lib/auth-store";
import { accountApi } from "@/services";
import { useAuth } from "@/providers/auth-provider";

/** Quyền của chủ dữ liệu: tải toàn bộ dữ liệu của mình, và xóa tài khoản (ẩn danh hóa). */
export function AccountDataCard() {
  const router = useRouter();
  const { signOut, role } = useAuth();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/users/me/export`, { headers: { Authorization: `Bearer ${tokenStore.get()}` } });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message ?? "failed");
      const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "lifely-my-data.json";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Your data was downloaded");
    } catch { toast.error("Could not download your data. Please try again."); } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await accountApi.delete(password);
      toast.success("Your account has been deleted. Thank you for being part of LIFELY.");
      signOut();
      router.replace("/");
    } catch (e) { setError(toApiError(e).message); } finally { setBusy(false); }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Your data</CardTitle></CardHeader>
      <CardContent className="space-y-5 text-sm">
        <div>
          <p className="font-medium">Download a copy</p>
          <p className="mt-1 text-muted-foreground">Get everything LIFELY holds about you as a JSON file: profile, privacy settings, donation history, matches and requests.</p>
          <Button variant="outline" className="mt-3" onClick={download} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Download />} Download my data</Button>
        </div>
        <div className="border-t border-border pt-5">
          <p className="font-medium">Delete my account</p>
          <p className="mt-1 text-muted-foreground">Your personal details, location and donation history are removed and you can no longer log in. Open requests you created are cancelled. This cannot be undone.</p>
          {role === "ORGANIZATION" ? <p className="mt-3 rounded-xl bg-muted p-3">Organization accounts are linked to verified records. Please contact our staff to close yours.</p> : (
            <Dialog.Root open={open} onOpenChange={(o) => { if (!busy) { setOpen(o); setPassword(""); setError(null); } }}>
              <Dialog.Trigger asChild><Button variant="outline" className="mt-3 border-critical/40 text-critical hover:bg-critical/5"><Trash2 /> Delete account</Button></Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
                <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 shadow-xl focus:outline-none">
                  <Dialog.Title className="text-lg font-semibold">Delete your account?</Dialog.Title>
                  <Dialog.Description className="mt-2 text-sm text-muted-foreground">This permanently removes your personal data. Enter your password to confirm.</Dialog.Description>
                  <div className="mt-4"><Field label="Password" htmlFor="del-pass" error={error ?? undefined}><Input id="del-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!error} /></Field></div>
                  <div className="mt-6 flex justify-end gap-2">
                    <Dialog.Close asChild><Button variant="outline" disabled={busy}>Keep my account</Button></Dialog.Close>
                    <Button className="bg-critical text-white hover:bg-critical/90" disabled={busy || password.length === 0} onClick={remove}>{busy && <Loader2 className="animate-spin" />} Delete permanently</Button>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
