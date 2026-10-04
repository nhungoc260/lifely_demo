"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Logo } from "@/components/layout/logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { SUPPORT } from "@/lib/support";

/** Trang lỗi cho mọi lỗi không lường trước ở giao diện. Không hiển thị chi tiết kỹ thuật cho người dùng. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <h1 className="text-3xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="mt-3 text-muted-foreground">We could not load this page. Your data is safe. Please try again, and if it keeps happening, call {SUPPORT.name} at {SUPPORT.phoneDisplay}.</p>
        {error.digest && <p className="mt-2 text-xs text-muted-foreground">Reference: {error.digest}</p>}
        <div className="mt-8 flex justify-center gap-3">
          <Button onClick={reset}><RefreshCw /> Try again</Button>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>Go home</Link>
        </div>
      </div>
    </div>
  );
}
