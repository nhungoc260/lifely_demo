import { ShieldCheck, Zap, Lock } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-[#1a0f12] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-[28rem] rounded-full bg-primary/40 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-16 size-[24rem] rounded-full bg-rose-500/15 blur-3xl" />
        <div className="relative [&_a]:text-white"><Logo /></div>
        <div className="relative max-w-md">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">When every second matters, connection matters.</h2>
          <ul className="mt-8 space-y-4 text-sm text-white/75">
            <li className="flex gap-3"><Zap className="mt-0.5 size-4 shrink-0 text-rose-300" aria-hidden />Real-time coordination between requests and nearby donors.</li>
            <li className="flex gap-3"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-rose-300" aria-hidden />Requests are verified before donors are contacted.</li>
            <li className="flex gap-3"><Lock className="mt-0.5 size-4 shrink-0 text-rose-300" aria-hidden />Privacy-first: exact donor locations are never shown.</li>
          </ul>
        </div>
        <p className="relative text-xs text-white/50">Connect. Donate. Save a Life.</p>
      </aside>
      <main id="main" className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between lg:justify-end">
          <div className="lg:hidden"><Logo /></div>
          <ThemeToggle />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
