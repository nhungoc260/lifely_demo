"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ChevronDown, LifeBuoy, PhoneCall, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { FAQS, searchFaq } from "@/components/support/faq-data";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SUPPORT } from "@/lib/support";
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
          className={cn(
            "fixed right-4 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            inApp ? "bottom-24 md:bottom-6" : "bottom-5",
          )}
          aria-label="Need help? Contact support"
        >
          <LifeBuoy className="size-4" aria-hidden /> <span className="hidden sm:inline">Need help?</span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 sm:bg-transparent" />
        <Dialog.Content className="fixed inset-x-3 bottom-3 z-50 flex max-h-[85dvh] flex-col rounded-2xl border border-border bg-card shadow-2xl focus:outline-none sm:inset-x-auto sm:bottom-6 sm:right-4 sm:w-[24rem]">
          <div className="flex items-start justify-between gap-3 border-b border-border p-5">
            <div>
              <Dialog.Title className="text-lg font-semibold tracking-tight">How can we help?</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">Talk to our team, or find a quick answer below.</Dialog.Description>
            </div>
            <Dialog.Close className="rounded-lg p-1 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Close"><X className="size-4" /></Dialog.Close>
          </div>

          <div className="overflow-y-auto p-5">
            <div className="rounded-2xl bg-secondary p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-secondary-foreground/70">Contact our staff</p>
              <p className="mt-1 font-semibold">{SUPPORT.name}</p>
              <a href={SUPPORT.telHref} className={cn(buttonVariants({ size: "lg" }), "mt-3 w-full")}><PhoneCall /> Call {SUPPORT.phoneDisplay}</a>
            </div>
            <Link href="/info/contact#message" onClick={() => setOpen(false)} className="mt-3 block rounded-xl border border-border px-4 py-3 text-center text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Or send us a message</Link>
            <p className="mt-3 rounded-xl border border-critical/30 bg-critical/5 p-3 text-xs leading-relaxed">
              <strong>Patient in danger?</strong> Call emergency services <a className="font-semibold underline" href={`tel:${SUPPORT.emergencyNumber}`}>{SUPPORT.emergencyNumber}</a> or the hospital first. LIFELY is a coordination platform, not an emergency service.
            </p>

            <div className="mt-5">
              <label htmlFor="faq-search" className="sr-only">Search help</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input id="faq-search" className="pl-10" placeholder="Ask a question, e.g. quên mật khẩu" value={query} onChange={(e) => setQuery(e.target.value)} />
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
                  <li className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">We could not find a matching answer. Please call {SUPPORT.name} at <a className="font-medium text-foreground underline" href={SUPPORT.telHref}>{SUPPORT.phoneDisplay}</a>.</li>
                )}
              </ul>
            </div>
            <p className="mt-5 text-[11px] leading-relaxed text-muted-foreground">Answers are prepared in advance and are general guidance only. LIFELY does not provide medical diagnosis, treatment, transfusion decisions, or final donor eligibility decisions.</p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
