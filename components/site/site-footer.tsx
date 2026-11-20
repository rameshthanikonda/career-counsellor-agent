import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { Brand } from "@/components/brand";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-canvas">
      <div className="container-page py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Brand />
            <p className="mt-4 max-w-xs text-sm leading-6 text-muted">
              A career counselling agent for education and careers, built for
              institutions that take learner data and learner trust seriously.
            </p>
            <div className="mt-5 space-y-1.5 text-sm text-muted">
              <a href="mailto:info@waecs.in" className="inline-flex items-center gap-2 hover:text-content">
                <Mail className="h-3.5 w-3.5" /> info@waecs.in
              </a>
              <br />
              <a href="tel:+918209628849" className="inline-flex items-center gap-2 hover:text-content">
                <Phone className="h-3.5 w-3.5" /> +91 82096 28849
              </a>
            </div>
          </div>

          <div>
            <p className="eyebrow mb-3">Product</p>
            <ul className="space-y-2 text-sm text-muted">
              <li><a href="#workflow" className="hover:text-content">How it works</a></li>
              <li><a href="#capabilities" className="hover:text-content">Capabilities</a></li>
              <li><a href="#guardrails" className="hover:text-content">Guardrails</a></li>
              <li><Link href="/methodology" className="hover:text-content">Method & limits</Link></li>
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-3">Workspaces</p>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/login" className="hover:text-content">Learner</Link></li>
              <li><Link href="/login?demo=counsellor" className="hover:text-content">Counsellor</Link></li>
              <li><Link href="/login?demo=admin" className="hover:text-content">Administrator</Link></li>
              <li><Link href="/verify" className="hover:text-content">Verify a report</Link></li>
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-3">Trust</p>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/privacy" className="hover:text-content">Privacy notice</Link></li>
              <li><Link href="/methodology" className="hover:text-content">Assessment method</Link></li>
              <li><Link href="/privacy#licensing" className="hover:text-content">Instrument licensing</Link></li>
              <li><Link href="/privacy#retention" className="hover:text-content">Data retention</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-[0.7rem] leading-5 text-faint sm:flex-row sm:items-start sm:justify-between">
          <p>© {new Date().getFullYear()} WAECS. All rights reserved.</p>
          <p className="max-w-2xl sm:text-right">
            Northstar provides career guidance only. It does not promise placement,
            admission, salary or visa outcomes, and it does not replace a qualified
            counsellor. Psychometric instruments are administered only under a valid
            licence.
          </p>
        </div>
      </div>
    </footer>
  );
}
