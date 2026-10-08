import { AlertOctagon, AlertTriangle, Info } from "lucide-react";

import { cn } from "@/lib/utils";
import { STATUS_LABEL } from "@/lib/format";
import { MATCH_LABEL, ORG_STATUS_LABEL, REPORT_STATUS_LABEL } from "@/lib/labels";
import type { MatchStatus, OrgStatus, ReportStatus, RequestStatus, Urgency } from "@/types/domain";

const tone = {
  red: "bg-critical/10 text-critical ring-critical/25",
  amber: "bg-warning/12 text-warning ring-warning/30",
  green: "bg-success/12 text-success ring-success/30",
  slate: "bg-muted text-muted-foreground ring-border",
  blue: "bg-sky-500/10 text-sky-700 ring-sky-500/25 dark:text-sky-300",
} as const;

export function Pill({ t, children, className }: { t: keyof typeof tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", tone[t], className)}>
      {children}
    </span>
  );
}

/** Mức khẩn cấp: luôn có icon + chữ, không chỉ dựa vào màu. */
export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  if (urgency === "CRITICAL") return <Pill t="red"><AlertOctagon className="size-3.5" aria-hidden />NGUY KỊCH</Pill>;
  if (urgency === "URGENT") return <Pill t="amber"><AlertTriangle className="size-3.5" aria-hidden />KHẨN</Pill>;
  return <Pill t="slate"><Info className="size-3.5" aria-hidden />BÌNH THƯỜNG</Pill>;
}

const requestTone: Record<RequestStatus, keyof typeof tone> = {
  CREATED: "slate", PENDING_VERIFICATION: "amber", VERIFIED: "blue", MATCHING: "blue", DONORS_CONTACTED: "blue",
  PARTIALLY_FULFILLED: "amber", FULFILLED: "green", CANCELLED: "slate", EXPIRED: "slate",
};
export function StatusBadge({ status }: { status: RequestStatus }) {
  return <Pill t={requestTone[status]}>{STATUS_LABEL[status]}</Pill>;
}

const matchTone: Record<MatchStatus, keyof typeof tone> = {
  PENDING: "slate", CONTACTED: "blue", ACCEPTED: "green", REJECTED: "slate", CANCELLED: "slate", COMPLETED: "green", EXPIRED: "slate",
};
export function MatchBadge({ status }: { status: MatchStatus }) {
  return <Pill t={matchTone[status]}>{MATCH_LABEL[status]}</Pill>;
}

const orgTone: Record<OrgStatus, keyof typeof tone> = {
  PENDING: "slate", UNDER_REVIEW: "amber", VERIFIED: "green", REJECTED: "red", SUSPENDED: "red",
};
export function OrgStatusBadge({ status }: { status: OrgStatus }) {
  return <Pill t={orgTone[status]}>{ORG_STATUS_LABEL[status]}</Pill>;
}

const reportTone: Record<ReportStatus, keyof typeof tone> = { OPEN: "red", INVESTIGATING: "amber", RESOLVED: "green", REJECTED: "slate" };
export function ReportBadge({ status }: { status: ReportStatus }) {
  return <Pill t={reportTone[status]}>{REPORT_STATUS_LABEL[status]}</Pill>;
}

export function BloodChip({ type, className }: { type: string; className?: string }) {
  return (
    <span className={cn("inline-flex min-w-11 items-center justify-center rounded-xl bg-secondary px-2.5 py-1 text-sm font-semibold tabular-nums text-secondary-foreground", className)}>
      {type}
    </span>
  );
}
