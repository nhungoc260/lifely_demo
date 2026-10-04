"use client";

import { FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shell/page-header";
import { OrgStatusBadge } from "@/components/ui/badges";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { API_URL, toApiError } from "@/lib/api";
import { tokenStore } from "@/lib/auth-store";
import { formatDate } from "@/lib/format";
import { adminApi } from "@/services";
import type { OrgStatus, Organization } from "@/types/domain";

type Action = { org: Organization; kind: "verify" | "reject" | "suspend" } | null;

export default function AdminOrganizations() {
  const [status, setStatus] = useState<OrgStatus | "">("UNDER_REVIEW");
  const [page, setPage] = useState(0);
  const [action, setAction] = useState<Action>(null);
  const res = useQuery(`admin-orgs:${status}:${page}`, () => adminApi.organizations({ status: status || undefined, page, size: 10 }));

  async function run(note: string) {
    if (!action) return;
    try { await adminApi.orgAction(action.org.id, action.kind, note || undefined); toast.success(`Organization ${action.kind === "verify" ? "verified" : action.kind === "reject" ? "rejected" : "suspended"}`); res.reload(); }
    catch (e) { toast.error(toApiError(e).message); throw e; }
  }

  async function download(id: string, name: string) {
    try {
      const r = await fetch(`${API_URL}/api/organizations/documents/${id}/download`, { headers: { Authorization: `Bearer ${tokenStore.get()}` } });
      if (!r.ok) throw new Error();
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
    } catch { toast.error("Could not download the document."); }
  }

  return (
    <>
      <PageHeader title="Organizations" description="Review documents and verify organizations." />
      <div className="mb-5 max-w-xs"><label htmlFor="org-status" className="sr-only">Status</label>
        <Select id="org-status" value={status} onChange={(e) => { setStatus(e.target.value as OrgStatus | ""); setPage(0); }}><option value="">All</option><option value="UNDER_REVIEW">Under review</option><option value="PENDING">Pending</option><option value="VERIFIED">Verified</option><option value="REJECTED">Rejected</option><option value="SUSPENDED">Suspended</option></Select></div>
      {res.initialLoading ? <Skeleton className="h-72" />
        : res.error && !res.data ? <ErrorState message={res.error.message} onRetry={res.reload} />
        : res.data && res.data.items.length === 0 ? <EmptyState title="No organizations here" description="Nothing matches this status." />
        : res.data && (
          <>
            <ul className="space-y-4">
              {res.data.items.map((o) => (
                <li key={o.id}>
                  <Card className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><p className="text-lg font-semibold">{o.name}</p><p className="text-sm text-muted-foreground">{o.type.replace("_", " ")} · {o.address}, {[o.district, o.city].filter(Boolean).join(", ")}</p><p className="mt-1 text-sm text-muted-foreground">{o.contactPerson} · {o.phone} · {o.email}</p></div>
                      <OrgStatusBadge status={o.verificationStatus} />
                    </div>
                    <div className="mt-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Documents</p>
                      {o.documents.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">None uploaded.</p> : (
                        <ul className="mt-2 flex flex-wrap gap-2">{o.documents.map((d) => <li key={d.id}><Button size="sm" variant="outline" onClick={() => download(d.id, d.fileName)}><FileText /> {d.fileName} <span className="text-muted-foreground">· {formatDate(d.uploadedAt)}</span></Button></li>)}</ul>)}
                    </div>
                    {o.verificationNote && <p className="mt-3 rounded-xl bg-muted p-3 text-sm">{o.verificationNote}</p>}
                    <div className="mt-5 flex flex-wrap gap-2">
                      {(o.verificationStatus === "UNDER_REVIEW" || o.verificationStatus === "PENDING" || o.verificationStatus === "REJECTED" || o.verificationStatus === "SUSPENDED") && <Button size="sm" onClick={() => setAction({ org: o, kind: "verify" })}>Verify</Button>}
                      {(o.verificationStatus === "UNDER_REVIEW" || o.verificationStatus === "PENDING") && <Button size="sm" variant="outline" onClick={() => setAction({ org: o, kind: "reject" })}>Reject</Button>}
                      {o.verificationStatus === "VERIFIED" && <Button size="sm" variant="outline" onClick={() => setAction({ org: o, kind: "suspend" })}>Suspend</Button>}
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
            <Pagination page={res.data} onChange={setPage} />
          </>
        )}
      <ConfirmDialog open={!!action} onOpenChange={(o) => !o && setAction(null)}
        title={action ? `${action.kind === "verify" ? "Verify" : action.kind === "reject" ? "Reject" : "Suspend"} ${action.org.name}?` : ""}
        description={action?.kind === "verify" ? "Verified organizations can publish requests that are trusted immediately." : action?.kind === "reject" ? "The organization will see your reason and can resubmit." : "The organization will lose verified status until reviewed again."}
        confirmLabel={action?.kind === "verify" ? "Verify" : action?.kind === "reject" ? "Reject" : "Suspend"} destructive={action?.kind !== "verify"}
        reasonLabel={action?.kind === "verify" ? "Note (optional)" : "Reason"} reasonRequired={action?.kind === "reject"} onConfirm={run} />
    </>
  );
}
