"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ChevronDown, LifeBuoy, Mail, PhoneCall, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { FAQS, searchFaq } from "@/components/support/faq-data";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STAFF, SUPPORT } from "@/lib/support";
import { cn } from "@/lib/utils";

const APP_PREFIXES = ["/donor", "/requester", "/organization", "/admin", "/onboarding"];

export function HelpWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const inApp = APP_PREFIXES.some((p) => pathname.startsWith(p));
  const searching = query.trim().length >= 2;
  const results = searching ? searchFaq(query) : FAQS.slice(0, 5);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          data-print-hide
          className={cn(
            "fixed right-4 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            inApp ? "bottom-24 lg:bottom-6" : "bottom-5",
          )}
          aria-label="Cần hỗ trợ? Liên hệ nhân viên"
        >
          <LifeBuoy className="size-4" aria-hidden /> <span className="hidden sm:inline">Cần hỗ trợ?</span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 sm:bg-transparent" />
        <Dialog.Content className="fixed inset-x-3 bottom-3 z-50 flex max-h-[85dvh] flex-col rounded-2xl border border-border bg-card shadow-2xl focus:outline-none sm:inset-x-auto sm:bottom-6 sm:right-4 sm:w-[28rem]">
          <div className="flex items-start justify-between gap-3 border-b border-border p-5">
            <div>
              <Dialog.Title className="text-lg font-semibold tracking-tight">Chúng tôi có thể giúp gì cho bạn?</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">Trò chuyện với đội ngũ của chúng tôi, hoặc xem nhanh câu trả lời bên dưới.</Dialog.Description>
            </div>
            <Dialog.Close className="rounded-lg p-1 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Đóng"><X className="size-4" /></Dialog.Close>
          </div>

          <div className="overflow-y-auto p-5">
            <div className="rounded-2xl bg-secondary p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-secondary-foreground/70">Liên hệ nhân viên</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {STAFF.map((s) => (
                  <div key={s.phone} className="flex min-w-0 flex-col rounded-xl bg-card p-3">
                    <p className="font-semibold leading-tight">{s.name}</p>
                    <a href={s.telHref} className={cn(buttonVariants({ size: "sm" }), "mt-3 w-full px-2")}><PhoneCall /> {s.phoneDisplay}</a>
                    {s.mailHref && (
                      <a href={s.mailHref} className="mt-2 flex items-start gap-1.5 break-all text-xs text-muted-foreground hover:text-foreground hover:underline"><Mail className="mt-0.5 size-3.5 shrink-0" aria-hidden /> {s.email}</a>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <Link href="/info/contact#message" onClick={() => setOpen(false)} className="mt-3 block rounded-xl border border-border px-4 py-3 text-center text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Hoặc gửi tin nhắn cho chúng tôi</Link>
            <p className="mt-3 rounded-xl border border-critical/30 bg-critical/5 p-3 text-xs leading-relaxed">
              <strong>Bệnh nhân đang nguy kịch?</strong> Hãy gọi cấp cứu <a className="font-semibold underline" href={`tel:${SUPPORT.emergencyNumber}`}>{SUPPORT.emergencyNumber}</a> hoặc bệnh viện trước. LIFELY là nền tảng điều phối, không phải dịch vụ cấp cứu.
            </p>

            <div className="mt-5">
              <label htmlFor="faq-search" className="sr-only">Tìm trợ giúp</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input id="faq-search" className="pl-10" placeholder="Đặt câu hỏi, VD: quên mật khẩu" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <ul className="mt-3 space-y-2" aria-live="polite">
                {results.map((f) => (
                  <li key={f.q} className="rounded-xl border border-border">
                    <button className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring rounded-xl" aria-expanded={expanded === f.q} onClick={() => setExpanded(expanded === f.q ? null : f.q)}>
                      {f.q}<ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", expanded === f.q && "rotate-180")} aria-hidden />
                    </button>
                    {expanded === f.q && <p className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">{f.a}</p>}
                  </li>
                ))}
                {searching && results.length === 0 && (
                  <li className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">Chúng tôi không tìm thấy câu trả lời phù hợp. Vui lòng gọi {SUPPORT.name} theo số <a className="font-medium text-foreground underline" href={SUPPORT.telHref}>{SUPPORT.phoneDisplay}</a>.</li>
                )}
              </ul>
            </div>
            <p className="mt-5 text-[11px] leading-relaxed text-muted-foreground">Các câu trả lời được soạn sẵn và chỉ mang tính hướng dẫn chung. LIFELY không đưa ra chẩn đoán, điều trị, quyết định truyền máu hay quyết định cuối cùng về điều kiện hiến máu.</p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
