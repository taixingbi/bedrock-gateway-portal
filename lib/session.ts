import { cookies } from "next/headers";

// The gateway has no real OIDC IdP wired up yet (see
// bedrock-gateway-app/services/gateway/config.py -- it falls back to a
// per-process dev JWT keypair until one is). Rather than fabricate a
// login flow the gateway can't actually verify, this portal asks the
// operator to paste in a bearer token they already have (minted the
// same way any other admin API caller gets one today, e.g.
// scripts/generate_dev_token.py inside the running container) and
// holds it in an HttpOnly cookie -- never exposed to client JS,
// attached server-side to every call to the gateway's admin API.
export const SESSION_COOKIE = "gw_admin_token";

export function getAdminToken(): string | undefined {
  return cookies().get(SESSION_COOKIE)?.value;
}
