"use client";

import { useEffect, useRef } from "react";

/** Đếm số tăng dần nhẹ nhàng; ghi trực tiếp vào DOM nên không gây render lại. Tôn trọng prefers-reduced-motion. */
export function CountUp({ value, pad = 0, className }: { value: number; pad?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fmt = (n: number) => String(Math.round(n)).padStart(pad, "0");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = fmt(value);
      return;
    }
    const start = performance.now();
    const duration = 900;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      el.textContent = fmt(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, pad]);
  return <span ref={ref} className={className}>{String(value).padStart(pad, "0")}</span>;
}
