"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { getHealth } from "@/services/health";
import type { HealthStatus } from "@/types/api";

type State =
  | { kind: "loading" }
  | { kind: "ok"; data: HealthStatus }
  | { kind: "error"; message: string };

export function BackendStatus() {
  const [state, setState] = useState<State>({ kind: "loading" });

  const check = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      setState({ kind: "ok", data: await getHealth() });
    } catch (e) {
      setState({
        kind: "error",
        message: e instanceof ApiError ? e.message : "Something went wrong.",
      });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void check();
  }, [check]);

  return (
    <section
      aria-live="polite"
      className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-sm"
    >
      <div className="flex items-center gap-3">
        {state.kind === "loading" && (
          <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
        )}
        {state.kind === "ok" && (
          <CheckCircle2 className="size-5 text-success" aria-hidden />
        )}
        {state.kind === "error" && (
          <CircleAlert className="size-5 text-critical" aria-hidden />
        )}
        <h2 className="font-medium">
          {state.kind === "loading" && "Checking backend…"}
          {state.kind === "ok" && `Backend is ${state.data.status}`}
          {state.kind === "error" && "Backend unreachable"}
        </h2>
      </div>

      {state.kind === "ok" && (
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted-foreground">Service</dt>
          <dd>{state.data.service}</dd>
          <dt className="text-muted-foreground">Database</dt>
          <dd>{state.data.database.status}</dd>
          <dt className="text-muted-foreground">Migration</dt>
          <dd>V{state.data.database.migrationVersion ?? "–"}</dd>
        </dl>
      )}
      {state.kind === "error" && (
        <p className="mt-3 text-sm text-muted-foreground">{state.message}</p>
      )}

      <Button
        variant="outline"
        size="sm"
        className="mt-5"
        onClick={check}
        disabled={state.kind === "loading"}
      >
        <RefreshCw /> Check again
      </Button>
    </section>
  );
}
