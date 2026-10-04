"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

import { AuthProvider } from "@/providers/auth-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthProvider>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </AuthProvider>
    </ThemeProvider>
  );
}
