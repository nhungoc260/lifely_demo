"use client";

import { Activity, CheckCircle2, Download, Loader2, Save, ShieldAlert, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { TrendChart } from "@/components/health/trend-chart";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { toApiError } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
import { statusText, toPoints } from "@/lib/health";
import { healthApi } from "@/services";
import type { Gender, HealthEvaluation, HealthInput } from "@/types/domain";

const GENDERS: { value: Gender; label: string }[] = [
  { value: "FEMALE", label: "Nữ" }, { value: "MALE", label: "Nam" }, { value: "UNSPECIFIED", label: "Không muốn nói" },
];
const DISCLAIMER = "Chỉ là hỗ trợ sàng lọc sơ bộ, không thay thế tư vấn y tế.";

function num(s: string): number | undefined {
  const v = Number(s.replace(",", "."));
  return s.trim() === "" || Number.isNaN(v) ? undefined : v;
}

export default function DonorHealth() {
  const summary = useQuery("health-summary", healthApi.summary);
  const checks = useQuery("health-checks", healthApi.checks);
  const [f, setF] = useState({ hr: "", sys: "", dia: "", kg: "" });
  const [result, setResult] = useState<HealthEvaluation | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const s = summary.data;

  const input = (): HealthInput => ({ heartRate: num(f.hr), systolic: num(f.sys), diastolic: num(f.dia), weightKg: num(f.kg) });
  const hasInput = Object.values(input()).some((v) => v !== undefined);

  async function run<T>(key: string, fn: () => Promise<T>, ok?: string): Promise<T | undefined> {
    setBusy(key);
    try { const r = await fn(); if (ok) toast.success(ok); return r; }
    catch (e) { toast.error(toApiError(e).message); return undefined; }
    finally { setBusy(null); }
  }

  const evaluate = async () => { const r = await run("eval", () => healthApi.evaluate(input())); if (r) setResult(r); };
  const save = async () => {
    const r = await run("save", () => healthApi.save(input()), "Đã lưu kết quả vào lịch sử");
    if (r) { setF({ hr: "", sys: "", dia: "", kg: "" }); setResult(null); checks.reload(); summary.reload(); }
  };
  const toggleConsent = async (granted: boolean) => { if (await run("consent", () => healthApi.setConsent(granted), granted ? "Đã bật lưu dữ liệu sức khỏe" : "Đã tắt lưu dữ liệu sức khỏe. Dữ liệu đã lưu vẫn còn cho đến khi bạn xóa.")) summary.reload(); };
  const setGender = async (g: Gender) => { if (await run("gender", () => healthApi.setGender(g))) summary.reload(); };
  const wipe = async () => { setDeleteOpen(false); if (await run("delete", () => healthApi.deleteAll(), "Đã xóa toàn bộ lịch sử sức khỏe")) { checks.reload(); summary.reload(); } };
  const download = (fmt: "json" | "csv") => run("dl" + fmt, () => healthApi.download(fmt), "Đã tải dữ liệu về máy");

  const list = checks.data ?? [];
  const short = (iso: string) => formatDate(iso).slice(0, 5);

  return (
    <>
      <PageHeader title="Sức khỏe của tôi" description="Theo dõi nhịp tim, huyết áp bạn tự đo và khả năng hiến lại. Dữ liệu chỉ của riêng bạn." />
      <p className="mb-6 flex items-start gap-2 rounded-xl bg-muted p-3 text-sm" role="note"><ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />{DISCLAIMER} Quyết định hiến máu luôn do nhân viên y tế tại cơ sở đưa ra sau khi sàng lọc.</p>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Tổng quan</CardTitle></CardHeader>
          <CardContent>
            {summary.initialLoading ? <Skeleton className="h-40" /> : summary.error && !s ? <ErrorState message={summary.error.message} onRetry={summary.reload} /> : s && (
              <div className="space-y-4 text-sm">
                <dl className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-muted p-3"><dt className="text-xs text-muted-foreground">Nhóm máu</dt><dd className="text-xl font-semibold">{s.bloodType ?? "–"}</dd></div>
                  <div className="rounded-xl bg-muted p-3"><dt className="text-xs text-muted-foreground">Hiến gần nhất</dt><dd className="font-semibold">{s.lastDonationDate ? formatDate(s.lastDonationDate) : "Chưa có"}</dd></div>
                  <div className="rounded-xl bg-muted p-3"><dt className="text-xs text-muted-foreground">Tổng số lần</dt><dd className="text-xl font-semibold tabular-nums">{s.totalDonations}</dd></div>
                </dl>
                <p className={`rounded-xl p-3 font-medium ${s.canDonate ? "bg-success/10 text-success" : "bg-warning/10"}`} role="status">
                  {s.canDonate ? <CheckCircle2 className="mr-2 inline size-4" aria-hidden /> : null}
                  {statusText(s.canDonate, s.daysUntilEligible, s.eligibleOn, formatDate)}
                </p>
                <p className="text-xs text-muted-foreground">Khoảng cách tối thiểu giữa hai lần hiến đang áp dụng: {s.intervalDays} ngày. Đây là quy tắc tham chiếu; cơ sở y tế quyết định cuối cùng.</p>
                <fieldset>
                  <legend className="mb-1 text-xs font-medium text-muted-foreground">Giới tính (tùy chọn, dùng để áp quy tắc cân nặng và giãn cách)</legend>
                  <div className="flex flex-wrap gap-2">
                    {GENDERS.map((g) => (
                      <label key={g.value} className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm ${s.gender === g.value ? "border-primary bg-primary/10" : "border-border"}`}>
                        <input type="radio" name="gender" className="accent-primary" checked={s.gender === g.value} disabled={busy === "gender"} onChange={() => setGender(g.value)} />{g.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="size-4" aria-hidden />Kiểm tra nhanh</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nhịp tim (lần/phút)" htmlFor="hr"><Input id="hr" inputMode="numeric" value={f.hr} onChange={(e) => setF({ ...f, hr: e.target.value })} /></Field>
              <Field label="Cân nặng (kg)" htmlFor="kg"><Input id="kg" inputMode="decimal" value={f.kg} onChange={(e) => setF({ ...f, kg: e.target.value })} /></Field>
              <Field label="Huyết áp tâm thu (mmHg)" htmlFor="sys"><Input id="sys" inputMode="numeric" value={f.sys} onChange={(e) => setF({ ...f, sys: e.target.value })} /></Field>
              <Field label="Huyết áp tâm trương (mmHg)" htmlFor="dia"><Input id="dia" inputMode="numeric" value={f.dia} onChange={(e) => setF({ ...f, dia: e.target.value })} /></Field>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={evaluate} disabled={!hasInput || busy !== null}>{busy === "eval" && <Loader2 className="animate-spin" />} Kiểm tra</Button>
              <Button variant="outline" onClick={save} disabled={!hasInput || busy !== null || !s?.consentGranted}><Save /> Lưu vào lịch sử</Button>
            </div>
            {s && !s.consentGranted && <p className="text-xs text-muted-foreground">Muốn lưu lịch sử, hãy bật &quot;Cho phép lưu dữ liệu sức khỏe&quot; ở phần dưới. Kiểm tra nhanh vẫn dùng được mà không lưu gì.</p>}
            {result && (
              <div className="space-y-2" aria-live="polite">
                <ul className="space-y-2">
                  {result.findings.filter((x) => x.status !== "NOT_MEASURED").map((x) => (
                    <li key={x.metric} className={`rounded-xl p-3 text-sm ${x.status === "OUTSIDE" ? "bg-warning/10" : "bg-success/10"}`}>
                      <p className="font-medium">{x.status === "OUTSIDE" ? "◆ Ngoài ngưỡng" : "✓ Trong ngưỡng"} · {x.label}: {x.value} {x.unit}</p>
                      <p className="text-xs text-muted-foreground">{x.note}</p>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">{result.disclaimer}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>Xu hướng</CardTitle></CardHeader>
        <CardContent>
          {checks.initialLoading ? <Skeleton className="h-48" /> : list.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có lần kiểm tra nào được lưu. Nhập chỉ số ở trên và bấm &quot;Lưu vào lịch sử&quot; để xem xu hướng.</p>
          ) : s && (
            <div className="grid gap-8 md:grid-cols-2">
              <TrendChart title="Nhịp tim" unit="lần/phút" band={{ min: s.rules.heartRateMin, max: s.rules.heartRateMax }}
                series={[{ name: "Nhịp tim", stroke: "stroke-primary", fill: "fill-primary", points: toPoints(list, (c) => c.heartRate, "HEART_RATE", short) }]} />
              <TrendChart title="Huyết áp" unit="mmHg" band={{ min: s.rules.systolicMin, max: s.rules.systolicMaxExclusive }}
                series={[
                  { name: "Tâm thu", stroke: "stroke-primary", fill: "fill-primary", points: toPoints(list, (c) => c.systolic, "SYSTOLIC", short) },
                  { name: "Tâm trương", stroke: "stroke-muted-foreground", fill: "fill-muted-foreground", points: toPoints(list, (c) => c.diastolic, "DIASTOLIC", short) },
                ]} />
            </div>
          )}
          {list.length > 0 && (
            <details className="mt-6 text-sm">
              <summary className="cursor-pointer font-medium">Xem dạng bảng ({list.length} lần)</summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead><tr className="text-muted-foreground"><th className="py-1 pr-3">Thời điểm</th><th className="pr-3">Nhịp tim</th><th className="pr-3">Huyết áp</th><th className="pr-3">Cân nặng</th><th>Ngưỡng sơ bộ</th></tr></thead>
                  <tbody>
                    {[...list].reverse().map((c) => (
                      <tr key={c.id} className="border-t border-border">
                        <td className="py-1 pr-3">{formatDateTime(c.measuredAt)}</td><td className="pr-3">{c.heartRate ?? "–"}</td>
                        <td className="pr-3">{c.systolic ?? "–"}/{c.diastolic ?? "–"}</td><td className="pr-3">{c.weightKg ?? "–"}</td>
                        <td>{c.anyOutside ? "◆ Có chỉ số ngoài ngưỡng" : "✓ Trong ngưỡng"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader><CardTitle>Dữ liệu của tôi</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          <label className="flex items-start justify-between gap-4">
            <span><span className="block font-medium">Cho phép lưu dữ liệu sức khỏe của tôi</span><span className="block text-xs text-muted-foreground">Chỉ bạn xem được. Không chia sẻ cho người cần máu hay người hiến khác. Bạn có thể tắt bất cứ lúc nào.</span></span>
            <input type="checkbox" className="mt-1 size-4 accent-primary" checked={!!s?.consentGranted} disabled={!s || busy === "consent"} onChange={(e) => toggleConsent(e.target.checked)} aria-label="Cho phép lưu dữ liệu sức khỏe" />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => download("json")} disabled={busy !== null}><Download /> Xuất JSON</Button>
            <Button variant="outline" size="sm" onClick={() => download("csv")} disabled={busy !== null}><Download /> Xuất CSV</Button>
            <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)} disabled={busy !== null || list.length === 0}><Trash2 /> Xóa lịch sử sức khỏe</Button>
          </div>
        </CardContent>
      </Card>
      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Xóa toàn bộ lịch sử sức khỏe?"
        description="Mọi lần kiểm tra bạn đã lưu sẽ bị xóa vĩnh viễn và không khôi phục được. Hồ sơ hiến máu của bạn không bị ảnh hưởng."
        confirmLabel="Xóa vĩnh viễn" destructive onConfirm={wipe} />
    </>
  );
}
