import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">We could not find that page</h1>
        <p className="mt-3 text-muted-foreground">The link may be old, or the request may already be closed.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className={buttonVariants()}>Go home</Link>
          <Link href="/#requests" className={buttonVariants({ variant: "outline" })}>See open requests</Link>
        </div>
      </div>
    </div>
  );
}
