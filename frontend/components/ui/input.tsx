import * as React from "react";

import { cn } from "@/lib/utils";

export const fieldClass =
  "w-full rounded-xl border border-border bg-card px-3.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-critical";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => (
    <input ref={ref} type={type} className={cn(fieldClass, "h-11", className)} {...props} />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(fieldClass, "min-h-24 py-3", className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(fieldClass, "h-11 appearance-none bg-[length:1rem] bg-[right_0.9rem_center] bg-no-repeat pr-9 [background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238a8f98' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]", className)} {...props}>
      {children}
    </select>
  ),
);
Select.displayName = "Select";

export function Field({
  label, htmlFor, error, hint, children, className,
}: {
  label: string; htmlFor: string; error?: string; hint?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p role="alert" className="text-xs font-medium text-critical">{error}</p>}
    </div>
  );
}
