import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Không tìm thấy trang này</h1>
        <p className="mt-3 text-muted-foreground">Liên kết có thể đã cũ, hoặc yêu cầu đã đóng.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className={buttonVariants()}>Về trang chủ</Link>
          <Link href="/#requests" className={buttonVariants({ variant: "outline" })}>Xem các yêu cầu đang mở</Link>
        </div>
      </div>
    </div>
  );
}
