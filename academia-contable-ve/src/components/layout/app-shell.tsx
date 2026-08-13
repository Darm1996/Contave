import type { ReactNode } from "react";
import { Navbar } from "./navbar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
