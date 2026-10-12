import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { SUPPORT } from "@/lib/support";

const COLS = [
  { title: "Nền tảng", links: [["Cách hoạt động", "/#how-it-works"], ["Yêu cầu khẩn cấp", "/#requests"], ["Dành cho người hiến máu", "/#donors"], ["Dành cho tổ chức", "/#organizations"]] },
  { title: "Tài nguyên", links: [["FAQ", "/info/faq"], ["An toàn", "/info/safety"], ["Liên hệ", "/info/contact"]] },
  { title: "Pháp lý", links: [["Quyền riêng tư", "/info/privacy"], ["Điều khoản", "/info/terms"], ["Miễn trừ y tế", "/info/medical-disclaimer"]] },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-3 text-sm text-muted-foreground">Kết nối. Hiến máu. Cứu một sinh mạng.</p>
          <p className="mt-4 text-sm">Cần hỗ trợ? Gọi <a className="font-medium text-primary hover:underline" href={SUPPORT.telHref}>{SUPPORT.name} · {SUPPORT.phoneDisplay}</a></p>
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
        <p className="mx-auto max-w-6xl px-5 py-5 text-xs text-muted-foreground">© 2026 LIFELY. Quyết định cuối cùng về điều kiện hiến máu và truyền máu thuộc về nhân viên y tế có chuyên môn.</p>
      </div>
    </footer>
  );
}
