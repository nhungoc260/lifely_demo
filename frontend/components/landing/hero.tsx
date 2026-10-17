"use client";

import { ArrowRight, Droplets, HandHeart } from "lucide-react";

import { CtaLink } from "@/components/landing/cta-link";
import { buttonVariants } from "@/components/ui/button";
import { CountUp } from "@/components/ui/count-up";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@/hooks/use-query";
import { cn } from "@/lib/utils";
import { publicApi } from "@/services";

function NetworkVisual() {
  return (
    <svg viewBox="0 0 480 420" role="img" aria-label="Người hiến máu và bệnh viện được kết nối qua mạng lưới LIFELY" className="h-auto w-full">
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="var(--primary)" stopOpacity="0.22" /><stop offset="100%" stopColor="var(--primary)" stopOpacity="0" /></radialGradient>
        <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="var(--border)" strokeWidth="1" /></pattern>
      </defs>
      <rect x="0" y="0" width="480" height="420" rx="28" fill="var(--card)" stroke="var(--border)" />
      <rect x="1" y="1" width="478" height="418" rx="27" fill="url(#grid)" opacity="0.55" />
      <circle cx="240" cy="210" r="170" fill="url(#glow)" />
      {/* đường kết nối */}
      <g stroke="var(--primary)" strokeWidth="1.6" strokeDasharray="5 6" fill="none" opacity="0.65">
        <path d="M96 96 Q170 150 240 210" /><path d="M118 330 Q180 280 240 210" /><path d="M392 120 Q310 160 240 210" /><path d="M240 210 Q330 250 384 322" />
      </g>
      {/* donor */}
      {[[96, 96], [118, 330], [392, 120]].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="10" fill="var(--secondary)" stroke="var(--primary)" strokeWidth="2" />
          <circle cx={x} cy={y} r="4" fill="var(--primary)" />
        </g>
      ))}
      <text x="60" y="76" fontSize="12" fill="var(--muted-foreground)">Người hiến</text>
      <text x="88" y="360" fontSize="12" fill="var(--muted-foreground)">Người hiến</text>
      <text x="372" y="102" fontSize="12" fill="var(--muted-foreground)">Người hiến</text>
      {/* LIFELY */}
      <circle cx="240" cy="210" r="22" fill="var(--primary)" opacity="0.18" className="pulse-ring" />
      <circle cx="240" cy="210" r="22" fill="var(--primary)" opacity="0.14" className="pulse-ring" style={{ animationDelay: "1.2s" }} />
      <circle cx="240" cy="210" r="26" fill="var(--primary)" />
      <path d="M240 197c-3.4 4.8-8 8.8-8 13.6a8 8 0 0 0 16 0c0-4.8-4.6-8.8-8-13.6Z" fill="#fff" />
      <text x="240" y="256" fontSize="13" fontWeight="600" letterSpacing="2" textAnchor="middle" fill="var(--foreground)">LIFELY</text>
      {/* hospital */}
      <rect x="366" y="304" width="36" height="36" rx="10" fill="#0f172a" />
      <path d="M384 313v18M375 322h18" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <text x="384" y="360" fontSize="12" textAnchor="middle" fill="var(--muted-foreground)">Bệnh viện</text>
    </svg>
  );
}

export function Hero() {
  const stats = useQuery("public-stats", publicApi.stats);
  const s = stats.data;

  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -top-40 right-[-10%] size-[38rem] rounded-full bg-primary/10 blur-3xl" />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:pb-28 lg:pt-24">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium" role="status">
            <span className="relative flex size-2"><span className={cn("absolute inline-flex size-full rounded-full opacity-60", s ? "animate-ping bg-success" : "bg-muted-foreground")} /><span className={cn("relative inline-flex size-2 rounded-full", s ? "bg-success" : "bg-muted-foreground")} /></span>
            {s ? "MẠNG LƯỚI LIFELY ĐANG HOẠT ĐỘNG" : stats.error ? "KHÔNG LẤY ĐƯỢC TRẠNG THÁI MẠNG LƯỚI" : "ĐANG KẾT NỐI MẠNG LƯỚI…"}
          </p>
          <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Khi từng giây đều quý giá, <span className="text-primary">sự kết nối</span> càng quan trọng.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            LIFELY giúp kết nối người cần máu với người hiến máu ở gần và điều phối phản hồi trên một nền tảng đáng tin cậy.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <CtaLink intent="NEED_BLOOD" className={cn(buttonVariants({ size: "lg" }), "shadow-lg shadow-primary/25")}>
              <Droplets /> TÔI CẦN MÁU
            </CtaLink>
            <CtaLink intent="DONATE" className={buttonVariants({ variant: "outline", size: "lg" })}>
              <HandHeart /> TÔI MUỐN HIẾN MÁU <ArrowRight />
            </CtaLink>
          </div>

          <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-border pt-6">
            {[
              { label: "Yêu cầu đang hoạt động", v: s?.activeRequests },
              { label: "Người hiến máu sẵn sàng", v: s?.availableDonors },
              { label: "Tổ chức đã xác minh", v: s?.verifiedOrganizations },
            ].map((x) => (
              <div key={x.label}>
                <dd className="text-3xl font-semibold tabular-nums tracking-tight">
                  {x.v === undefined ? <Skeleton className="h-9 w-12" /> : <CountUp value={x.v} pad={2} />}
                </dd>
                <dt className="mt-1 text-xs text-muted-foreground">{x.label}</dt>
              </div>
            ))}
          </dl>
          {s?.demoEnvironment && <p className="mt-4 text-xs text-muted-foreground">Môi trường demo: số liệu lấy từ dữ liệu mẫu.</p>}
        </div>
        <div className="mx-auto w-full max-w-md lg:max-w-none"><NetworkVisual /></div>
      </div>
    </section>
  );
}
