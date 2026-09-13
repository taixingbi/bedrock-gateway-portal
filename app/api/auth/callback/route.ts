import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForIdToken } from "@/lib/cognito";
import { listTenants } from "@/lib/gateway";
import { SESSION_COOKIE, STATE_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

function loginError(request: NextRequest, message: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = cookies().get(STATE_COOKIE)?.value;
  cookies().delete(STATE_COOKIE);

  if (!code) {
    return loginError(request, "Cognito did not return an authorization code.");
  }
  if (!state || !expectedState || state !== expectedState) {
    return loginError(request, "Login request expired or was tampered with. Try again.");
  }

  let idToken: string;
  try {
    idToken = await exchangeCodeForIdToken(code);
  } catch (err) {
    const message = err instanceof Error ? err.message : "token exchange failed";
    return loginError(request, message);
  }

  // Same as before Cognito: set the cookie, then make one real admin
  // call before trusting it, so a token the gateway will reject (e.g.
  // an admin not yet in the platform_admin group) never leaves the
  // operator silently "logged in".
  cookies().set(SESSION_COOKIE, idToken, {
    httpOnly: true,
    secure: process.env.PORTAL_HTTPS === "true",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });

  try {
    await listTenants();
  } catch (err) {
    cookies().delete(SESSION_COOKIE);
    const message = err instanceof Error ? err.message : "token rejected";
    return loginError(request, `Signed in with Cognito, but the gateway rejected the session: ${message}`);
  }

  return NextResponse.redirect(new URL("/tenants", request.url));
}
