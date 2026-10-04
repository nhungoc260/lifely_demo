import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Page } from "@/types/domain";

export function Pagination({ page, onChange }: { page: Page<unknown>; onChange: (p: number) => void }) {
  if (page.totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 pt-4 text-sm">
      <p className="text-muted-foreground">
        Page {page.page + 1} of {page.totalPages} · {page.totalItems} total
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page.page <= 0} onClick={() => onChange(page.page - 1)} aria-label="Previous page"><ChevronLeft /> Prev</Button>
        <Button variant="outline" size="sm" disabled={page.page >= page.totalPages - 1} onClick={() => onChange(page.page + 1)} aria-label="Next page">Next <ChevronRight /></Button>
      </div>
    </nav>
  );
}
