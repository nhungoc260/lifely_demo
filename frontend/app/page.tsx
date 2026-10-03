import { BackendStatus } from "@/components/backend-status";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-semibold tracking-tight">LIFELY</h1>
        <p className="mt-2 text-muted-foreground">Connect. Donate. Save a Life.</p>
      </div>
      <BackendStatus />
      <p className="text-xs text-muted-foreground">
        Phase 1 setup check. The landing page is built in Phase 5.
      </p>
    </main>
  );
}
