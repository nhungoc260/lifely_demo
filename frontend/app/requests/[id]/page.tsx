"use client";

import { ArrowLeft, Clock, MapPin } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { Footer } from "@/components/landing/footer";
import { Navbar } from "@/components/landing/navbar";
import { MapContainerLazy } from "@/components/map/map-dynamic";
import { ReportDialog } from "@/components/requests/report-dialog";
import { BloodChip, UrgencyBadge } from "@/components/ui/badges";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Countdown } from "@/components/ui/countdown";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@/hooks/use-query";
import { publicApi } from "@/services";
import { useAuth } from "@/providers/auth-provider";

export default function PublicRequestPage() {
  const { id } = useParams<{ id: string }>();
  const { role, status } = useAuth();
  const q = useQuery(`public-request:${id}`, () => publicApi.request(id));
  const r = q.data;


  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-5 py-10">
        <Link href="/#requests" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Tất cả yêu cầu</Link>
        {q.initialLoading ? (
          <Skeleton className="mt-6 h-96" />
        ) : q.error && !r ? (
          q.error.status === 404 ? (
            <EmptyState className="mt-6" title="Yêu cầu này không còn mở" description="Có thể yêu cầu đã đủ người, bị hủy hoặc hết hạn." action={<Link href="/#requests" className={buttonVariants()}>Xem các yêu cầu đang mở</Link>} />
          ) : <ErrorState className="mt-6" message={q.error.message} onRetry={q.reload} />
        ) : r ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <Card className="p-6 sm:p-8">
              <div className="flex items-center justify-between"><UrgencyBadge urgency={r.urgency} /><BloodChip type={r.bloodType} className="text-lg" /></div>
              <h1 className="mt-6 text-4xl font-semibold tracking-tight">Cần {r.unitsNeeded} đơn vị</h1>
              <div className="mt-6">
                <div className="mb-2 flex justify-between text-sm"><span className="text-muted-foreground">Đã xác nhận</span><span className="font-medium tabular-nums">{r.unitsConfirmed} / {r.unitsRequired}</span></div>
                <ProgressBar value={r.unitsConfirmed} max={r.unitsRequired} label="Người hiến máu đã xác nhận" />
              </div>
              <dl className="mt-8 space-y-4 text-sm">
                <div className="flex gap-3"><MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden /><div><dt className="text-muted-foreground">Bệnh viện</dt><dd className="font-medium">{r.hospitalName}</dd><dd className="text-muted-foreground">{[r.district, r.city].filter(Boolean).join(", ")}</dd></div></div>
                <div className="flex gap-3"><Clock className="size-4 shrink-0 text-muted-foreground" aria-hidden /><div><dt className="text-muted-foreground">Cần trong vòng</dt><dd className="text-2xl font-semibold"><Countdown deadline={r.deadline} /></dd></div></div>
              </dl>
              <div className="mt-8 rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                {status === "authenticated" && role === "DONOR" ? (
                  <>Nếu yêu cầu này phù hợp với bạn, LIFELY sẽ thông báo trực tiếp. <Link href="/donor/requests" className="font-medium text-primary hover:underline">Xem các yêu cầu được kết nối với bạn</Link>.</>
                ) : (
                  <>Muốn giúp đỡ? <Link href="/register?role=DONOR" className="font-medium text-primary hover:underline">Tham gia làm người hiến máu</Link> để LIFELY thông báo khi có yêu cầu phù hợp với bạn.</>
                )}
              </div>
              {status === "authenticated" && <div className="mt-4 flex justify-end"><ReportDialog targetType="REQUEST" targetId={r.id} /></div>}
            </Card>
            <div className="space-y-4">
              <MapContainerLazy center={[r.latitude, r.longitude]} zoom={14} requests={[r]} height={320} scrollWheelZoom={false} />
              <p className="text-xs text-muted-foreground">Điều kiện hiến máu cuối cùng phải do nhân viên y tế xác nhận. Thông tin liên hệ chỉ chia sẻ với người hiến máu đã nhận lời.</p>
            </div>
          </div>
        ) : null}
      </main>
      <Footer />
    </>
  );
}
