import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { cn } from "@/lib/utils/cn";

/**
 * Shared chrome for public, unauthenticated pages (method, privacy,
 * verification). Keeps the marketing shell consistent without pulling in a
 * route group that would rewrite the existing landing page.
 */
export function PublicPage({
  children,
  width = "prose",
}: {
  children: ReactNode;
  width?: "prose" | "wide";
}) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="container-page py-12 sm:py-16">
        <div
          className={cn(
            "mx-auto w-full",
            width === "prose" ? "max-w-3xl" : "max-w-5xl"
          )}
        >
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
