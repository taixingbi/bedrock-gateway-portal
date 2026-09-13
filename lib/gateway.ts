import { getAdminToken } from "./session";

// GATEWAY_API_URL is the open JWT route (bedrock-gateway-infra's
// api_gateway_url output), e.g.
// https://xxxx.execute-api.us-east-1.amazonaws.com -- admin endpoints
// live under /v1/admin/*, verified via Authorization: Bearer <token>,
// the same as any other JWT-path caller (see auth/identity.py). Not
// the /iam/* SigV4 route -- that one is for machine callers signing
// with AWS credentials, not a browser session.
const GATEWAY_API_URL = process.env.GATEWAY_API_URL ?? "";

export class GatewayError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function gatewayFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!GATEWAY_API_URL) {
    throw new GatewayError(500, "GATEWAY_API_URL is not configured");
  }
  const token = getAdminToken();
  if (!token) {
    throw new GatewayError(401, "no admin session");
  }

  const res = await fetch(`${GATEWAY_API_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let message = `gateway returned ${res.status}`;
    let code: string | undefined;
    try {
      const body = await res.json();
      message = body?.error?.message ?? message;
      code = body?.error?.code;
    } catch {
      // non-JSON error body -- keep the generic message
    }
    throw new GatewayError(res.status, message, code);
  }

  return res.json() as Promise<T>;
}

export type TenantSummary = {
  tenant_id: string;
  state: "ACTIVE" | "THROTTLED" | "READ_ONLY" | "SUSPENDED" | "EMERGENCY_BLOCK";
  models: string[];
  rpm_limit: number;
  guardrail_policy: string;
  route_set: string | null;
  monthly_budget: number | null;
  policy_epoch: number;
};

export type UsageEntry = {
  tenant_id: string;
  month: string;
  spend: number;
  monthly_budget: number | null;
  utilization: number | null;
};

export type RouteSetEntry = {
  name: string;
  primary: string;
  primary_certified: boolean;
  fallbacks: { model: string; certified: boolean }[];
};

export type ApplicationEntry = {
  principal_arn: string;
  tenant_id: string;
  application_id: string;
  roles: string[];
};

export function listTenants() {
  return gatewayFetch<{ tenants: TenantSummary[] }>("/v1/admin/tenants");
}

export function getUsage() {
  return gatewayFetch<{ tenants: UsageEntry[] }>("/v1/admin/usage");
}

export function listRouteSets() {
  return gatewayFetch<{ route_sets: RouteSetEntry[]; certified_models: string[] }>(
    "/v1/admin/route-sets"
  );
}

export function listApplications() {
  return gatewayFetch<{ applications: ApplicationEntry[]; note: string }>(
    "/v1/admin/applications"
  );
}

export function setTenantState(tenantId: string, state: string) {
  return gatewayFetch<{ tenant_id: string; state: string; policy_epoch: number }>(
    `/v1/admin/tenants/${encodeURIComponent(tenantId)}/state`,
    { method: "PUT", body: JSON.stringify({ state }) }
  );
}
