"use client";

import { Activity, CheckCircle2, Download, Droplets, HeartPulse, Loader2, Save, ShieldAlert, Trash2, Weight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { TrendChart } from "@/components/health/trend-chart";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ListGroup, ListRow, MiniStat, Segmented, TINT, type Tint } from "@/components/ui/mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { toApiError } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
import { statusText, toPoints } from "@/lib/health";
import { healthApi } from "@/services";
import { cn } from "@/lib/utils";
import type { Gender, HealthEvaluation, HealthInput } from "@/types/domain";

const GENDERS: { value: Gender; label: string }[] = [
  { value: "FEMALE", label: "Nữ" }, { value: "MALE", label: "Nam" }, { value: "UNSPECIFIED", label: "Không muốn nói" },
];
const DISCLAIMER = "Chỉ là hỗ trợ sàng lọc sơ bộ, không thay thế tư vấn y tế.";

function num(s: string): number | undefined {
  const v = Number(s.replace(",", "."));
  return s.trim() === "" || Number.isNaN(v) ? undefined : v;
}

/** Một chỉ số = một ô: icon màu, tên ngắn, số lớn nhập trực tiếp, đơn vị nằm cạnh số. Bấm vào ô là gõ được ngay. */
function MetricInput({ id, icon: Icon, tint, label, unit, mode, value, onChange }: { id: string; icon: typeof Activity; tint: Tint; label: string; unit: string; mode: "numeric" | "decimal"; value: string; onChange: (v: string) => void }) {
  return (
    <label htmlFor={id} className="press block cursor-text rounded-2xl bg-muted/60 p-3.5 ring-1 ring-border/60 focus-within:ring-2 focus-within:ring-primary/50">
      <span className="flex items-center gap-2 text-[13px] font-medium"><span className={cn("grid size-7 place-items-center rounded-lg", TINT[tint])}><Icon className="size-4" aria-hidden /></span>{label}</span>
      <span className="mt-2.5 flex items-baseline gap-1.5">
        <input id={id} inputMode={mode} placeholder="--" value={value} onChange={(e) => onChange(e.target.value)} className="w-full min-w-0 bg-transparent text-[28px] font-bold leading-none tabular-nums tracking-tight placeholder:text-muted-foreground/40 focus:outline-none" />
        <span className="shrink-0 text-xs text-muted-foreground">{unit}</span>
      </span>
    </label>
  );
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
      <p className="mb-6 hidden items-start gap-2 rounded-xl bg-muted p-3 text-sm md:flex" role="note"><ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />{DISCLAIMER} Quyết định hiến máu luôn do nhân viên y tế tại cơ sở đưa ra sau khi sàng lọc.</p>

      <div className="space-y-5 md:space-y-6">
        {/* Tổng quan */}
        {summary.initialLoading ? <Skeleton className="h-40 rounded-2xl" /> : summary.error && !s ? <ErrorState message={summary.error.message} onRetry={summary.reload} /> : s && (
          <section aria-label="Tổng quan">
            <div className="grid grid-cols-3 gap-2.5">
              <MiniStat icon={Droplets} tint="rose" label="Nhóm máu" value={s.bloodType ?? "–"} />
              <MiniStat icon={HeartPulse} tint="sky" label="Hiến gần nhất" value={<span className="text-lg">{s.lastDonationDate ? formatDate(s.lastDonationDate).slice(0, 5) : "Chưa có"}</span>} />
              <MiniStat icon={CheckCircle2} tint="emerald" label="Tổng số lần" value={s.totalDonations} />
            </div>
            <p className={cn("mt-3 flex items-center gap-2 rounded-2xl px-4 py-3 text-[15px] font-semibold", s.canDonate ? "bg-success/12 text-success" : "bg-warning/12 text-warning")} role="status">
              {s.canDonate && <CheckCircle2 className="size-5 shrink-0" aria-hidden />}
              {statusText(s.canDonate, s.daysUntilEligible, s.eligibleOn, formatDate)}
            </p>
            <p className="mt-1.5 px-1 text-xs text-muted-foreground">Cách tối thiểu {s.intervalDays} ngày giữa hai lần hiến. Cơ sở y tế quyết định cuối cùng.</p>
          </section>
        )}

        {/* Cho phép lưu dữ liệu: cài đặt quan trọng nên nằm ngay đầu trang */}
        <ListGroup footer="Chỉ bạn xem được, không chia sẻ cho người cần máu hay người hiến khác. Tắt bất cứ lúc nào.">
          <label className="press-row flex min-h-[56px] cursor-pointer items-center justify-between gap-4 px-4 py-2.5">
            <span className="min-w-0"><span className="block text-[15px] font-medium">Lưu dữ liệu sức khỏe</span><span className="block text-xs text-muted-foreground">{s?.consentGranted ? "Đang bật" : "Đang tắt: kiểm tra nhanh vẫn dùng được"}</span></span>
            <Switch checked={!!s?.consentGranted} disabled={!s || busy === "consent"} onCheckedChange={toggleConsent} aria-label="Cho phép lưu dữ liệu sức khỏe" />
          </label>
        </ListGroup>

        <div className="grid gap-5 md:gap-6 lg:grid-cols-2">
          {/* Kiểm tra nhanh */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="size-4" aria-hidden />Kiểm tra nhanh</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2.5">
                <MetricInput id="hr" icon={HeartPulse} tint="rose" label="Nhịp tim" unit="lần/phút" mode="numeric" value={f.hr} onChange={(v) => setF({ ...f, hr: v })} />
                <MetricInput id="kg" icon={Weight} tint="amber" label="Cân nặng" unit="kg" mode="decimal" value={f.kg} onChange={(v) => setF({ ...f, kg: v })} />
                <MetricInput id="sys" icon={Activity} tint="sky" label="Tâm thu" unit="mmHg" mode="numeric" value={f.sys} onChange={(v) => setF({ ...f, sys: v })} />
                <MetricInput id="dia" icon={Activity} tint="violet" label="Tâm trương" unit="mmHg" mode="numeric" value={f.dia} onChange={(v) => setF({ ...f, dia: v })} />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button size="lg" className="press w-full" onClick={evaluate} disabled={!hasInput || busy !== null}>{busy === "eval" && <Loader2 className="animate-spin" />} Kiểm tra</Button>
                <Button size="lg" variant="outline" className="press w-full" onClick={save} disabled={!hasInput || busy !== null || !s?.consentGranted}><Save /> Lưu vào lịch sử</Button>
              </div>
              {s && !s.consentGranted && <p className="text-xs text-muted-foreground">Bật &quot;Lưu dữ liệu sức khỏe&quot; ở trên để lưu lịch sử.</p>}
              {result && (
                <div className="space-y-2" aria-live="polite">
                  <ul className="space-y-2">
                    {result.findings.filter((x) => x.status !== "NOT_MEASURED").map((x) => (
                      <li key={x.metric} className={`rounded-2xl p-3.5 text-sm ${x.status === "OUTSIDE" ? "bg-warning/10" : "bg-success/10"}`}>
                        <p className="font-semibold">{x.status === "OUTSIDE" ? "◆ Ngoài ngưỡng" : "✓ Trong ngưỡng"} · {x.label}: {x.value} {x.unit}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{x.note}</p>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground">{result.disclaimer}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Giới tính */}
          {s && (
            <Card className="self-start">
              <CardHeader><CardTitle>Giới tính</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Segmented label="Giới tính" value={s.gender as Gender} onChange={(g) => { if (busy !== "gender") setGender(g); }} options={GENDERS} />
                <p className="text-xs text-muted-foreground">Tùy chọn, dùng để áp quy tắc cân nặng và giãn cách.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Xu hướng */}
        <Card>
          <CardHeader><CardTitle>Xu hướng</CardTitle></CardHeader>
          <CardContent>
            {checks.initialLoading ? <Skeleton className="h-48" /> : list.length === 0 ? (
              <div className="flex flex-col items-center py-2 text-center">
                <svg viewBox="0 0 240 64" className="h-16 w-full max-w-xs text-primary/25" fill="none" aria-hidden>
                  <path d="M2 44 C 30 44, 36 14, 62 20 S 100 52, 126 32 S 168 6, 192 26 S 224 40, 238 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 7" />
                </svg>
                <p className="mt-2 text-sm font-medium">Chưa có dữ liệu</p>
                <p className="text-xs text-muted-foreground">Lưu một lần kiểm tra để xem xu hướng.</p>
              </div>
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

        {/* Dữ liệu của tôi */}
        <ListGroup title="Dữ liệu của tôi">
          <ListRow icon={Download} tint="sky" label="Xuất JSON" onClick={busy === null ? () => download("json") : undefined} />
          <ListRow icon={Download} tint="emerald" label="Xuất CSV" onClick={busy === null ? () => download("csv") : undefined} />
          <ListRow icon={Trash2} danger label="Xóa lịch sử sức khỏe" onClick={busy === null && list.length > 0 ? () => setDeleteOpen(true) : undefined} chevron={false} />
        </ListGroup>
        <p className="px-1 text-xs text-muted-foreground md:hidden"><ShieldAlert className="mr-1 inline size-3.5 align-text-bottom" aria-hidden />{DISCLAIMER}</p>
      </div>
      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Xóa toàn bộ lịch sử sức khỏe?"
        description="Mọi lần kiểm tra bạn đã lưu sẽ bị xóa vĩnh viễn và không khôi phục được. Hồ sơ hiến máu của bạn không bị ảnh hưởng."
        confirmLabel="Xóa vĩnh viễn" destructive onConfirm={wipe} />
    </>
  );
}
