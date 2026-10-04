"use client";

import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shell/page-header";
import { BloodChip, StatusBadge, UrgencyBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Countdown } from "@/components/ui/countdown";
import { DataTable } from "@/components/ui/data-table";
import { Input, Select } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { toApiError } from "@/lib/api";
import { STATUS_LABEL } from "@/lib/format";
import { adminApi } from "@/services";
import { BLOOD_TYPES, type AdminRequestRow } from "@/types/domain";

type Action = { row: AdminRequestRow; kind: "verify" | "reject" | "cancel" } | null;

export default function AdminRequests() {
  const [urgency, setUrgency] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [status, setStatus] = useState("");
  const [city, setCity] = useState("");
  const [page, setPage] = useState(0);
  const [action, setAction] = useState<Action>(null);
  const res = useQuery(`admin-req:${urgency}:${bloodType}:${status}:${city}:${page}`, () => adminApi.requests({ urgency: urgency || undefined, bloodType: bloodType || undefined, status: status || undefined, city: city || undefined, page, size: 15 }));

  async function run(note: string) {
    if (!action) return;
    try { await adminApi.requestAction(action.row.request.id, action.kind, note || undefined); toast.success(action.kind === "verify" ? "Request verified. Matching has started." : action.kind === "reject" ? "Request rejected" : "Request cancelled"); res.reload(); }
    catch (e) { toast.error(toApiError(e).message); throw e; }
  }
  const reset = (fn: (v: string) => void) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => { fn(e.target.value); setPage(0); };

  return (
    <>
      <PageHeader title="Requests" description="Verify new requests and monitor coordination." />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select aria-label="Urgency" value={urgency} onChange={reset(setUrgency)}><option value="">All urgencies</option><option>CRITICAL</option><option>URGENT</option><option>NORMAL</option></Select>
        <Select aria-label="Blood type" value={bloodType} onChange={reset(setBloodType)}><option value="">All blood types</option>{BLOOD_TYPES.map((b) => <option key={b}>{b}</option>)}</Select>
        <Select aria-label="Status" value={status} onChange={reset(setStatus)}><option value="">All statuses</option>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        <Input aria-label="City" placeholder="City" value={city} onChange={reset(setCity)} />
      </div>
      {res.initialLoading ? <Skeleton className="h-96" />
        : res.error && !res.data ? <ErrorState message={res.error.message} onRetry={res.reload} />
        : res.data && res.data.items.length === 0 ? <EmptyState title="No requests match" description="Try clearing a filter." />
        : res.data && (
          <>
            <DataTable caption="Blood requests" rows={res.data.items} rowKey={(r) => r.request.id} columns={[
              { key: "bt", header: "Blood", cell: (r) => <BloodChip type={r.request.bloodType} /> },
              { key: "urg", header: "Urgency", cell: (r) => <UrgencyBadge urgency={r.request.urgency} /> },
              { key: "hos", header: "Location", cell: (r) => <div><p className="font-medium">{r.request.hospitalName}</p><p className="text-xs text-muted-foreground">by {r.requesterName ?? "–"}</p></div> },
              { key: "units", header: "Confirmed", align: "right", cell: (r) => <span className="tabular-nums">{r.request.unitsConfirmed} / {r.request.unitsRequired}</span> },
              { key: "left", header: "Remaining", cell: (r) => ["FULFILLED", "CANCELLED", "EXPIRED"].includes(r.request.status) ? "–" : <Countdown deadline={r.request.deadline} /> },
              { key: "st", header: "Status", cell: (r) => <StatusBadge status={r.request.status} /> },
              { key: "act", header: "Actions", align: "right", cell: (r) => (
                <div className="flex justify-end gap-2">
                  {r.request.status === "PENDING_VERIFICATION" && <><Button size="sm" onClick={() => setAction({ row: r, kind: "verify" })}>Verify</Button><Button size="sm" variant="outline" onClick={() => setAction({ row: r, kind: "reject" })}>Reject</Button></>}
                  {["VERIFIED", "MATCHING", "DONORS_CONTACTED", "PARTIALLY_FULFILLED"].includes(r.request.status) && <Button size="sm" variant="outline" onClick={() => setAction({ row: r, kind: "cancel" })}>Cancel</Button>}
                </div>
              ) },
            ]} />
            <Pagination page={res.data} onChange={setPage} />
          </>
        )}
      <ConfirmDialog
        open={!!action} onOpenChange={(o) => !o && setAction(null)}
        title={action?.kind === "verify" ? "Verify this request?" : action?.kind === "reject" ? "Reject this request?" : "Cancel this request?"}
        description={action?.kind === "verify" ? "Matching starts immediately and nearby donors will be contacted." : action?.kind === "reject" ? "The requester will be told the request was not approved." : "Donors who were contacted or accepted will be notified."}
        confirmLabel={action?.kind === "verify" ? "Verify and start matching" : action?.kind === "reject" ? "Reject" : "Cancel request"}
        destructive={action?.kind !== "verify"}
        reasonLabel={action?.kind === "verify" ? undefined : "Reason"} reasonRequired={action?.kind === "reject"}
        onConfirm={run}
      />
    </>
  );
}
