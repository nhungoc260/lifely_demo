"use client";

import { Building2, HeartPulse, LocateFixed, LockKeyhole, Radio, ShieldCheck, UserCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { CtaLink } from "@/components/landing/cta-link";
import { MapContainerLazy } from "@/components/map/map-dynamic";
import { RequestCard } from "@/components/requests/request-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@/hooks/use-query";
import { cn } from "@/lib/utils";
import { publicApi } from "@/services";

export function Impact() {
  const stats = useQuery("public-stats", publicApi.stats);
  const s = stats.data;
  const items = [
    { label: "Người hiến máu đã đăng ký", v: s?.registeredDonors },
    { label: "Yêu cầu đang hoạt động", v: s?.activeRequests },
    { label: "Kết nối thành công", v: s?.successfulConnections },
    { label: "Tổ chức đã xác minh", v: s?.verifiedOrganizations },
  ];
  return (
    <section className="border-y border-border bg-card" aria-labelledby="impact-title">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <h2 id="impact-title" className="max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">Một nền tảng. Điều phối nhanh hơn.</h2>
        <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {items.map((i) => (
            <div key={i.label} className="border-l-2 border-primary/30 pl-5">
              <dd className="text-5xl font-semibold tabular-nums tracking-tight">{i.v === undefined ? <Skeleton className="h-12 w-20" /> : <CountUp value={i.v} />}</dd>
              <dt className="mt-2 text-sm text-muted-foreground">{i.label}</dt>
            </div>
          ))}
        </dl>
        {stats.error && <p className="mt-6 text-sm text-muted-foreground">Số liệu trực tiếp tạm thời chưa có.</p>}
        {s?.demoEnvironment && <p className="mt-6 text-xs text-muted-foreground">Môi trường demo: số liệu lấy từ dữ liệu mẫu.</p>}
      </div>
    </section>
  );
}

const STEPS = [
  { n: "01", title: "Tạo yêu cầu.", text: "Cho chúng tôi biết nhóm máu, số đơn vị, bệnh viện và thời hạn. Yêu cầu được xác minh trước khi liên hệ bất kỳ ai." },
  { n: "02", title: "LIFELY tìm người hiến máu phù hợp.", text: "Những người hiến máu tương thích, đang sẵn sàng ở gần được xếp hạng và liên hệ theo vòng mở rộng dần, không bao giờ gửi cho tất cả cùng lúc." },
  { n: "03", title: "Người hiến máu phản hồi và yêu cầu được điều phối.", text: "Phản hồi đến theo thời gian thực. Số lượng xác nhận không bao giờ vượt quá nhu cầu của bệnh nhân." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24" aria-labelledby="how-title">
      <h2 id="how-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">LIFELY hoạt động như thế nào</h2>
      <ol className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
        <div aria-hidden className="absolute left-[19px] top-2 hidden h-[calc(100%-1rem)] w-px bg-border max-md:block" />
        <div aria-hidden className="absolute left-0 right-0 top-[19px] hidden h-px bg-border md:block" />
        {STEPS.map((s) => (
          <li key={s.n} className="relative pl-14 md:pl-0 md:pt-14">
            <span className="absolute left-0 top-0 grid size-10 place-items-center rounded-full border border-border bg-card text-sm font-semibold tabular-nums text-primary">{s.n}</span>
            <h3 className="text-lg font-semibold tracking-tight">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function EmergencyRequests() {
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const key = `public-requests:${loc ? `${loc.lat.toFixed(2)},${loc.lng.toFixed(2)}` : "all"}`;
  const q = useQuery(key, () => publicApi.requests({ size: 6, lat: loc?.lat, lng: loc?.lng }));

  function locate() {
    if (!("geolocation" in navigator)) return toast.error("Trình duyệt của bạn không hỗ trợ định vị.");
    navigator.geolocation.getCurrentPosition(
      (p) => setLoc({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => toast.error("Không lấy được vị trí của bạn."),
      { timeout: 8000 },
    );
  }

  return (
    <section id="requests" className="scroll-mt-20 bg-surface py-24" aria-labelledby="req-title">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="req-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">Yêu cầu khẩn cấp gần bạn</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={locate}><LocateFixed /> {loc ? "Khoảng cách từ vị trí của bạn" : "Hiện khoảng cách từ tôi"}</Button>
            <Link href="/map" className={buttonVariants({ variant: "ghost", size: "sm" })}>Mở bản đồ</Link>
          </div>
        </div>
        <div className="mt-10">
          {q.initialLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-64" />)}</div>
          ) : q.error && !q.data ? (
            <ErrorState message={q.error.message} onRetry={q.reload} />
          ) : q.data && q.data.items.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {q.data.items.map((r) => <RequestCard key={r.id} r={r} href={`/requests/${r.id}`} />)}
            </div>
          ) : (
            <EmptyState title="Chưa có yêu cầu khẩn cấp nào ở gần." description="Hiện chưa có yêu cầu nào đã xác minh đang mở. Hãy tham gia làm người hiến máu để được báo khi có yêu cầu." action={<CtaLink intent="DONATE" className={buttonVariants()}>Trở thành người hiến máu</CtaLink>} />
          )}
        </div>
      </div>
    </section>
  );
}

export function MapPreview() {
  const reqs = useQuery("map-preview-requests", () => publicApi.requests({ size: 50 }));
  const orgs = useQuery("map-preview-orgs", publicApi.organizations);
  return (
    <section className="mx-auto max-w-6xl px-5 py-24" aria-labelledby="map-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="map-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">Xem nơi đang cần giúp đỡ</h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">Chỉ hiển thị bệnh viện và các yêu cầu đang mở. LIFELY không bao giờ hiển thị vị trí của bất kỳ người hiến máu nào.</p>
        </div>
        <Link href="/map" className={buttonVariants({ variant: "outline" })}>Mở bản đồ đầy đủ</Link>
      </div>
      <div className="mt-8 overflow-hidden rounded-[1.25rem] border border-border shadow-sm">
        <MapContainerLazy requests={reqs.data?.items ?? []} hospitals={orgs.data ?? []} height={420} scrollWheelZoom={false} />
      </div>
    </section>
  );
}

export function Audiences() {
  return (
    <section className="border-y border-border bg-card">
      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-24 md:grid-cols-2">
        <Card id="donors" className="scroll-mt-24 p-8">
          <HeartPulse className="size-7 text-primary" aria-hidden />
          <h2 className="mt-5 text-2xl font-semibold tracking-tight">Dành cho người hiến máu</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Cho chúng tôi biết nhóm máu và khu vực của bạn, bật trạng thái sẵn sàng, và chỉ được báo khi một yêu cầu đã xác minh thật sự cần bạn. Bạn luôn biết vì sao mình được kết nối, và tự kiểm soát quyền riêng tư của mình.</p>
          <CtaLink intent="DONATE" className={cn(buttonVariants(), "mt-6")}>Tham gia làm người hiến máu</CtaLink>
        </Card>
        <Card id="organizations" className="scroll-mt-24 p-8">
          <Building2 className="size-7 text-primary" aria-hidden />
          <h2 className="mt-5 text-2xl font-semibold tracking-tight">Dành cho tổ chức</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Bệnh viện và trung tâm máu đăng ký, được đội ngũ của chúng tôi xác minh, rồi tạo các yêu cầu được ưu tiên, theo dõi phản hồi theo thời gian thực và xác nhận các lần hiến máu.</p>
          <CtaLink intent="JOIN_ORG" className={cn(buttonVariants({ variant: "outline" }), "mt-6")}>Đăng ký tổ chức của bạn</CtaLink>
        </Card>
      </div>
    </section>
  );
}

export function Trust() {
  const items = [
    { icon: LockKeyhole, title: "Ưu tiên riêng tư", text: "Vị trí chính xác và số điện thoại của người hiến máu không bao giờ được công khai." },
    { icon: UserCheck, title: "Tổ chức đã xác minh", text: "Mọi tổ chức đều được đội ngũ của chúng tôi xem xét trước khi được xác minh yêu cầu." },
    { icon: ShieldCheck, title: "Tài khoản an toàn", text: "Mật khẩu được băm, phiên đăng nhập ngắn hạn và nhật ký hoạt động đầy đủ." },
    { icon: Radio, title: "Điều phối thời gian thực", text: "Số xác nhận cập nhật ngay lập tức, không cần tải lại trang." },
  ];
  return (
    <section id="about" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24" aria-labelledby="trust-title">
      <h2 id="trust-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">Xây dựng để đáng tin cậy</h2>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((i) => (
          <div key={i.title}>
            <span className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary"><i.icon className="size-5" aria-hidden /></span>
            <h3 className="mt-4 font-semibold">{i.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{i.text}</p>
          </div>
        ))}
      </div>
      <p className="mt-14 rounded-2xl border border-border bg-card p-5 text-sm leading-relaxed text-muted-foreground">
        LIFELY là nền tảng điều phối, không đưa ra chẩn đoán, điều trị, quyết định truyền máu hay quyết định cuối cùng về điều kiện hiến máu. Các quyết định này phải do nhân viên y tế có chuyên môn đưa ra.
      </p>
    </section>
  );
}
