import { ShieldCheck, UserCheck, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";
import { VERIFICATION_LABEL } from "@/lib/labels";
import type { VerificationLevel } from "@/types/domain";

const STYLE: Record<VerificationLevel, string> = {
  SELF_REPORTED: "bg-muted text-muted-foreground",
  REQUESTER_CONFIRMED: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  ORG_VERIFIED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};
const ICON = { SELF_REPORTED: UserRound, REQUESTER_CONFIRMED: UserCheck, ORG_VERIFIED: ShieldCheck };

/** Mức xác nhận luôn có chữ và biểu tượng, không chỉ dựa vào màu. */
export function VerificationBadge({ level, by }: { level: VerificationLevel; by?: string | null }) {
  const Icon = ICON[level];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", STYLE[level])}>
      <Icon className="size-3" aria-hidden />
      {VERIFICATION_LABEL[level]}{level === "ORG_VERIFIED" && by ? `: ${by}` : ""}
    </span>
  );
}
