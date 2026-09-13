"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/session";
import { listTenants } from "@/lib/gateway";

export async function login(_prevState: { error?: string } | undefined, formData: FormData) {
  const token = (formData.get("token") as string | null)?.trim();
  if (!token) {
    return { error: "Paste a bearer token." };
  }

  // Verify it before trusting it -- set the cookie, then make one real
  // admin call; if that fails, undo the cookie rather than leaving the
  // operator "logged in" with a token the gateway will reject on every
  // subsequent page.
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    // NOT process.env.NODE_ENV === "production": the Dockerfile always
    // sets NODE_ENV=production, but the portal's ALB is deliberately
    // HTTP-only for now (no ACM cert/domain yet -- see modules/
    // portal_service's own comment on why). A Secure cookie is
    // silently dropped by the browser over plain HTTP, which is
    // exactly what broke login here: server-side everything succeeded
    // (cookie "set", listTenants() verified, redirect fired), the
    // browser just never actually kept the cookie, so middleware sent
    // it straight back to /login with no error to show. Flip this to
    // an env-driven check once the ALB has TLS.
    secure: process.env.PORTAL_HTTPS === "true",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  try {
    await listTenants();
  } catch (err) {
    cookies().delete(SESSION_COOKIE);
    const message = err instanceof Error ? err.message : "token rejected";
    return { error: `Token rejected by the gateway: ${message}` };
  }

  redirect("/tenants");
}

export async function logout() {
  cookies().delete(SESSION_COOKIE);
  redirect("/login");
}
