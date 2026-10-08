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
      <div className="mb-6 flex justify-end print:hidden"><Button onClick={() => window.print()} disabled={!r}><Printer /> In poster</Button></div>
      {q.initialLoading ? <Skeleton className="h-[40rem]" />
        : !r ? <EmptyState title="Yêu cầu này không còn mở" description="Chỉ có poster cho các yêu cầu đang mở và đã xác minh." />
        : (
          <article className="rounded-3xl border-4 border-primary bg-white p-10 text-center text-black print:rounded-none print:border-8">
            <p className="text-lg font-semibold uppercase tracking-[0.3em] text-primary">KHẨN · CẦN MÁU</p>
            <p className="mt-6 text-[9rem] font-bold leading-none tracking-tight text-primary">{r.bloodType}</p>
            <p className="mt-4 text-4xl font-semibold">Cần {r.unitsNeeded} đơn vị</p>
            <p className="mt-8 text-2xl font-medium">{r.hospitalName}</p>
            <p className="text-lg text-neutral-600">{[r.district, r.city].filter(Boolean).join(", ")}</p>
            <p className="mt-6 text-xl">Cần trước <strong>{formatDateTime(r.deadline)}</strong></p>
            <div className="mt-8 flex flex-col items-center gap-3">
              {qr.data ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr.data} alt="Mã QR dẫn đến trạng thái trực tiếp của yêu cầu" width={220} height={220} />
              ) : <Skeleton className="size-[220px]" />}
              <p className="text-lg font-medium">Quét để xem trạng thái trực tiếp và cách giúp đỡ</p>
            </div>
            <p className="mt-8 text-lg">Cần hỗ trợ? Gọi {SUPPORT.name}: <strong>{SUPPORT.phoneDisplay}</strong></p>
            <p className="mx-auto mt-6 max-w-xl text-xs leading-relaxed text-neutral-500">Cung cấp bởi LIFELY, nền tảng điều phối. LIFELY không đưa ra chẩn đoán, điều trị, quyết định truyền máu hay quyết định cuối cùng về điều kiện hiến máu. Nhân viên y tế quyết định điều kiện hiến máu.</p>
          </article>
        )}
    </main>
  );
}
