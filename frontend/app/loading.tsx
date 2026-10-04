import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-5 py-16" aria-busy="true" aria-live="polite">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
