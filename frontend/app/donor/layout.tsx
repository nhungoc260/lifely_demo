import { RoleShell } from "@/components/shell/app-shell";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <RoleShell role="DONOR">{children}</RoleShell>;
}
