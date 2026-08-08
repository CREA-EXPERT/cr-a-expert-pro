import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { AssistantBientot } from "@/components/AssistantBientot";

export function PageShell({ children, withFooter = true }: { children: ReactNode; withFooter?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      {withFooter && <SiteFooter />}
      <AssistantBientot />
    </div>
  );
}
