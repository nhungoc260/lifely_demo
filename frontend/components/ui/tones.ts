/** Bảng màu phụ của LIFELY: cùng độ sáng/độ bão hòa nên phối với đỏ thương hiệu mà không chói. Dùng cho ô icon, huy hiệu, thống kê. */
export const TONES = {
  rose: "bg-rose-500/12 text-rose-600 dark:bg-rose-400/15 dark:text-rose-300",
  teal: "bg-teal-500/12 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300",
  amber: "bg-amber-500/15 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
  indigo: "bg-indigo-500/12 text-indigo-600 dark:bg-indigo-400/15 dark:text-indigo-300",
  emerald: "bg-emerald-500/12 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
  violet: "bg-violet-500/12 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300",
} as const;
export type Tone = keyof typeof TONES;
