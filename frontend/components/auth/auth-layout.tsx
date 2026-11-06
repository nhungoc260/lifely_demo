import { ShieldCheck, Zap, Lock } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <aside className="hero-brand hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="relative [&_a]:text-white"><Logo tone="light" /></div>
        <div className="relative max-w-md">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">Khi từng giây đều quý giá, sự kết nối càng quan trọng.</h2>
          <ul className="mt-8 space-y-4 text-sm text-white/85">
            <li className="flex gap-3"><Zap className="mt-0.5 size-4 shrink-0 text-white" aria-hidden />Điều phối thời gian thực giữa yêu cầu và những người hiến máu ở gần.</li>
            <li className="flex gap-3"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-white" aria-hidden />Yêu cầu được xác minh trước khi liên hệ người hiến máu.</li>
            <li className="flex gap-3"><Lock className="mt-0.5 size-4 shrink-0 text-white" aria-hidden />Ưu tiên riêng tư: vị trí chính xác của người hiến máu không bao giờ hiển thị.</li>
          </ul>
        </div>
        <p className="relative text-xs text-white/70">Give Blood. Give Life.</p>
      </aside>
      <main id="main" className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between lg:justify-end">
          <div className="lg:hidden"><Logo /></div>
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
