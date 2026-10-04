"use client";

import QRCode from "qrcode";
import { Printer } from "lucide-react";
import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { formatDateTime } from "@/lib/format";
import { SUPPORT } from "@/lib/support";
import { publicApi } from "@/services";

/** Poster A4 để in dán ở bệnh viện: chỉ dùng dữ liệu công khai của request. */
export default function RequestPoster() {
  const { id } = useParams<{ id: string }>();
  const q = useQuery(`poster:${id}`, () => publicApi.request(id));
  const qr = useQuery(q.data ? `poster-qr:${id}` : null, () => QRCode.toDataURL(`${window.location.origin}/requests/${id}`, { margin: 1, width: 360, errorCorrectionLevel: "M" }));
  const r = q.data;

  return (
    <main id="main" className="mx-auto min-h-dvh max-w-3xl px-6 py-8 print:max-w-none print:p-0">
      <div className="mb-6 flex justify-end print:hidden"><Button onClick={() => window.print()} disabled={!r}><Printer /> Print poster</Button></div>
      {q.initialLoading ? <Skeleton className="h-[40rem]" />
        : !r ? <EmptyState title="This request is no longer open" description="Posters are only available for open, verified requests." />
        : (
          <article className="rounded-3xl border-4 border-primary bg-white p-10 text-center text-black print:rounded-none print:border-8">
            <p className="text-lg font-semibold uppercase tracking-[0.3em] text-primary">Urgent · Blood needed</p>
            <p className="mt-6 text-[9rem] font-bold leading-none tracking-tight text-primary">{r.bloodType}</p>
            <p className="mt-4 text-4xl font-semibold">{r.unitsNeeded} unit{r.unitsNeeded === 1 ? "" : "s"} needed</p>
            <p className="mt-8 text-2xl font-medium">{r.hospitalName}</p>
            <p className="text-lg text-neutral-600">{[r.district, r.city].filter(Boolean).join(", ")}</p>
            <p className="mt-6 text-xl">Needed before <strong>{formatDateTime(r.deadline)}</strong></p>
            <div className="mt-8 flex flex-col items-center gap-3">
              {qr.data ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr.data} alt="QR code linking to the live request status" width={220} height={220} />
              ) : <Skeleton className="size-[220px]" />}
              <p className="text-lg font-medium">Scan to see the live status and how to help</p>
            </div>
            <p className="mt-8 text-lg">Questions? Call {SUPPORT.name}: <strong>{SUPPORT.phoneDisplay}</strong></p>
            <p className="mx-auto mt-6 max-w-xl text-xs leading-relaxed text-neutral-500">Powered by LIFELY, a coordination platform. LIFELY does not provide medical diagnosis, treatment, transfusion decisions, or final donor eligibility decisions. Healthcare professionals decide eligibility.</p>
          </article>
        )}
    </main>
  );
}
