import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Northstar — Career Counsellor Agent",
    template: "%s · Northstar",
  },
  description:
    "An enterprise career counselling workspace for learners, counsellors and institutions. Psychometric assessment, evidence-led shortlists, career maps and 12-month plans — with a human checkpoint before anything reaches the learner.",
  applicationName: "Northstar",
  authors: [{ name: "WAECS" }],
  keywords: [
    "career counselling",
    "psychometric assessment",
    "course shortlist",
    "career path planning",
    "education",
  ],
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F3EB" },
    { media: "(prefers-color-scheme: dark)", color: "#090E13" },
  ],
};

const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('northstar-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = stored ? stored === 'dark' : prefersDark;
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-brandContrast"
        >
          Skip to content
        </a>
        <div className="grain-overlay" aria-hidden />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
