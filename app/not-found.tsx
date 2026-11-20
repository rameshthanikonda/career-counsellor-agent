import Link from "next/link";
import { Compass } from "lucide-react";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="container-page flex min-h-[60vh] items-center py-16">
        <div className="mx-auto max-w-lg text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brandSoft text-brand">
            <Compass className="h-5 w-5" />
          </span>
          <p className="eyebrow mt-5">404 · Off the map</p>
          <h1 className="display mt-2 text-2xl font-semibold tracking-tight text-content sm:text-3xl">
            This page does not exist.
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            The link may be wrong, or the record may have moved. Your workspace
            and the public method page are still where you left them.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <Link href="/" className={buttonClasses("primary", "md")}>
              Back to Northstar
            </Link>
            <Link href="/login" className={buttonClasses("secondary", "md")}>
              Sign in
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
