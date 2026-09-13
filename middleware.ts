import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "./lib/session";

export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const isLoginRoute = request.nextUrl.pathname.startsWith("/login");

  if (!hasSession && !isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (hasSession && isLoginRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/tenants";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
