import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}

/**
 * Bảng cho admin: header dính khi cuộn, cột căn đều; trên mobile chuyển thành danh sách thẻ.
 */
export function DataTable<T>({ columns, rows, rowKey, onRowClick, caption }: { columns: Column<T>[]; rows: T[]; rowKey: (r: T) => string; onRowClick?: (r: T) => void; caption: string }) {
  const al = (a?: string) => (a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left");
  return (
    <>
      <div className="hidden max-h-[65vh] overflow-auto rounded-2xl border border-border bg-card md:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur">
            <tr>{columns.map((c) => <th key={c.key} scope="col" className={cn("whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground", al(c.align))}>{c.header}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={rowKey(r)} className={cn("transition-colors", onRowClick && "cursor-pointer hover:bg-muted/50")} onClick={() => onRowClick?.(r)}>
                {columns.map((c) => <td key={c.key} className={cn("px-4 py-3 align-middle", al(c.align), c.className)}>{c.cell(r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-3 md:hidden">
        {rows.map((r) => (
          <li key={rowKey(r)} className="rounded-2xl border border-border bg-card p-4" onClick={() => onRowClick?.(r)}>
            <dl className="space-y-2 text-sm">
              {columns.map((c) => <div key={c.key} className="flex items-start justify-between gap-4"><dt className="shrink-0 text-muted-foreground">{c.header}</dt><dd className="text-right">{c.cell(r)}</dd></div>)}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
