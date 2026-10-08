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
        <h1 className="text-3xl font-semibold tracking-tight">Đã xảy ra sự cố</h1>
        <p className="mt-3 text-muted-foreground">Chúng tôi không tải được trang này. Dữ liệu của bạn vẫn an toàn. Vui lòng thử lại, và nếu vẫn lỗi, hãy gọi {SUPPORT.name} theo số {SUPPORT.phoneDisplay}.</p>
        {error.digest && <p className="mt-2 text-xs text-muted-foreground">Mã tham chiếu: {error.digest}</p>}
        <div className="mt-8 flex justify-center gap-3">
          <Button onClick={reset}><RefreshCw /> Thử lại</Button>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>Về trang chủ</Link>
        </div>
      </div>
    </div>
  );
}
