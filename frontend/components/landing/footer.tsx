import Link from "next/link";

import { Logo } from "@/components/layout/logo";

const COLS = [
  { title: "Platform", links: [["How it works", "/#how-it-works"], ["Emergency Requests", "/#requests"], ["For Donors", "/#donors"], ["For Organizations", "/#organizations"]] },
  { title: "Resources", links: [["FAQ", "/info/faq"], ["Safety", "/info/safety"], ["Contact", "/info/contact"]] },
  { title: "Legal", links: [["Privacy", "/info/privacy"], ["Terms", "/info/terms"], ["Medical Disclaimer", "/info/medical-disclaimer"]] },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-3 text-sm text-muted-foreground">Connect. Donate. Save a Life.</p>
        </div>
        {COLS.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h2 className="text-sm font-semibold">{c.title}</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {c.links.map(([label, href]) => <li key={label}><Link href={href} className="hover:text-foreground">{label}</Link></li>)}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-5 py-5 text-xs text-muted-foreground">© 2027 LIFELY. Final eligibility and transfusion decisions must be made by qualified healthcare professionals.</p>
      </div>
    </footer>
  );
}
