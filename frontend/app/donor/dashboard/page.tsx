"use client";

import { CheckCircle2, Droplets, HeartPulse } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DonorAppHome } from "@/components/app/donor-home";
import { useAppMode } from "@/hooks/use-app-mode";
import { MatchCard, MatchRow } from "@/components/donor/match-card";
import { DonorStatusBanner } from "@/components/donor/status-banner";
import { JourneyCard } from "@/components/donor/journey-card";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { ListGroup, MiniStat } from "@/components/ui/mobile";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useNow } from "@/hooks/use-now";
import { useQuery } from "@/hooks/use-query";
import { toApiError } from "@/lib/api";
import { donorStatus } from "@/lib/donor-status";
import { donorApi } from "@/services";
import { useNotifications } from "@/providers/notifications-provider";
import { useAuth } from "@/providers/auth-provider";

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Chào buổi sáng" : h < 18 ? "Chào buổi chiều" : "Chào buổi tối";
}

const ACTIVE = ["VERIFIED", "MATCHING", "DONORS_CONTACTED", "PARTIALLY_FULFILLED"];

export default function DonorDashboard() {
  const { user } = useAuth();
  const { version } = useNotifications();
  const now = useNow();
  const appMode = useAppMode();
  const dash = useQuery(`donor-dash:${version}`, donorApi.dashboard);
  const profile = useQuery("donor-dash-profile", donorApi.me);
  const matches = useQuery(`donor-open-matches:${version}`, () => donorApi.matches());
  const [available, setAvailable] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [greet, setGreet] = useState("Xin chào");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGreet(greeting());
  }, []);
  const isAvailable = available ?? dash.data?.availability === "AVAILABLE";

  async function toggle(next: boolean) {
    setAvailable(next);
    setSaving(true);
    try {
      await donorApi.setAvailability(next ? "AVAILABLE" : "NOT_AVAILABLE");
      toast.success(next ? "Bạn đã sẵn sàng hiến máu" : "Bạn sẽ không nhận yêu cầu mới");
      dash.reload();
    } catch (e) {
      setAvailable(!next);
      toast.error(toApiError(e).message);
    } finally { setSaving(false); }
  }

  const today = now ? new Date(now).toISOString().slice(0, 10) : null;
  const status = dash.data && today
    ? donorStatus({ profileComplete: dash.data.profileComplete, available: isAvailable, lastDonationDate: profile.data?.lastDonationDate ?? null, todayIso: today })
    : null;

  const open = (matches.data ?? []).filter((m) => (m.status === "CONTACTED" || m.status === "PENDING")
    && new Date(m.deadline).getTime() > now && ACTIVE.includes(m.requestStatus));

  if (appMode) return <DonorAppHome greet={greet} name={user?.fullName} available={isAvailable} saving={saving || dash.initialLoading} onToggle={toggle} loading={dash.initialLoading} bloodType={dash.data?.bloodType} donations={dash.data?.confirmedDonations} nearby={dash.data?.nearbyRequests} matches={open} />;

  return (
    <>
      <div className="mb-4 md:mb-5">
        <p className="text-sm text-muted-foreground md:hidden">{greet}</p>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight md:text-3xl md:font-semibold"><span className="hidden md:inline">{greet}, </span>{user?.fullName}</h1>
      </div>

      {profile.error && !profile.data
        ? <ErrorState message={profile.error.message} onRetry={profile.reload} />
        : <DonorStatusBanner status={profile.initialLoading ? null : status} available={isAvailable} saving={saving || dash.initialLoading} onToggle={toggle} />}

      <section className="mt-4 md:mt-8" aria-label="Tóm tắt của bạn">
        {dash.error && !dash.data ? <ErrorState message={dash.error.message} onRetry={dash.reload} /> : (
          <>
            <div className="grid grid-cols-3 gap-2.5 md:hidden">
              <MiniStat icon={Droplets} tint="rose" label="Nhóm máu" value={dash.data?.bloodType ?? "–"} loading={dash.initialLoading} />
              <MiniStat icon={HeartPulse} tint="sky" label="Gần bạn" value={dash.data?.nearbyRequests ?? 0} loading={dash.initialLoading} />
              <MiniStat icon={CheckCircle2} tint="emerald" label="Lần hiến" value={dash.data?.confirmedDonations ?? 0} loading={dash.initialLoading} />
            </div>
            <div className="hidden grid-cols-3 gap-4 md:grid">
              <StatCard label="Nhóm máu của bạn" value={dash.data?.bloodType ?? "–"} icon={Droplets} accent loading={dash.initialLoading} />
              <StatCard label="Yêu cầu ở gần bạn" value={dash.data?.nearbyRequests ?? 0} icon={HeartPulse} loading={dash.initialLoading} hint="Đang mở trong khu vực của bạn" />
              <StatCard label="Lần hiến đã ghi nhận" value={dash.data?.confirmedDonations ?? 0} icon={CheckCircle2} loading={dash.initialLoading} />
            </div>
          </>
        )}
      </section>

      <section className="mt-6 md:mt-10" aria-labelledby="needs-you">
        <div className="mb-2 flex items-end justify-between md:mb-1"><h2 id="needs-you" className="text-lg font-bold tracking-tight md:text-xl md:font-semibold">Cần bạn phản hồi</h2><Link href="/donor/requests" className="text-sm font-medium text-primary hover:underline">Xem tất cả</Link></div>
        <p className="mb-4 hidden text-sm text-muted-foreground md:block">“Mức phù hợp” cho biết yêu cầu khớp với bạn đến đâu (nhóm máu, khoảng cách, thời gian còn lại). Chỉ dùng để sắp xếp ưu tiên, không phải đánh giá y tế.</p>
        {open.length > 0 && status && status.kind !== "READY" && <p className="mb-3 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">Các yêu cầu dưới đây đã được gửi cho bạn trước đó.</p>}
        {matches.initialLoading ? <div className="grid gap-3 md:grid-cols-2 md:gap-5"><Skeleton className="h-24 md:h-60" /><Skeleton className="h-24 md:h-60" /></div>
          : matches.error && !matches.data ? <ErrorState message={matches.error.message} onRetry={matches.reload} />
          : open.length === 0 ? <EmptyState title="Chưa có yêu cầu nào đang chờ bạn" description={!isAvailable ? "Bạn đang tắt nhận yêu cầu. Hãy bật lại để LIFELY có thể kết nối bạn." : "LIFELY sẽ báo ngay khi có yêu cầu phù hợp. Bạn không cần làm gì thêm."} action={!isAvailable ? <button onClick={() => toggle(true)} className={buttonVariants({ size: "sm" })}>Bật nhận yêu cầu</button> : undefined} />
          : <>
              <ListGroup className="md:hidden">{open.slice(0, 4).map((m) => <MatchRow key={m.matchId} m={m} />)}</ListGroup>
              <div className="hidden gap-5 md:grid md:grid-cols-2">{open.slice(0, 4).map((m) => <MatchCard key={m.matchId} m={m} />)}</div>
            </>}
      </section>

      {profile.data && <section className="mt-6 md:mt-8" aria-label="Hành trình hiến máu"><JourneyCard totalDonations={profile.data.totalDonations} /></section>}
    </>
  );
}
