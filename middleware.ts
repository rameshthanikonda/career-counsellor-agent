import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/learner",
  "/counsellor",
  "/admin",
  "/onboarding",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get("ns_session")?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/learner/:path*",
    "/counsellor/:path*",
    "/admin/:path*",
    "/onboarding/:path*",
  ],
};
