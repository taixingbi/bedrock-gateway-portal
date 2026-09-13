# bedrock-gateway-portal

M10 self-service portal MVP for the [bedrock-gateway](../bedrock-gateway-app)
platform. Next.js (App Router) + TypeScript + Tailwind, calling the
gateway's `/v1/admin/*` API server-side. No backend logic lives here --
every page just renders what the gateway already computes.

## Pages

- **Tenants** -- state (with the kill switch), quota, budget, guardrail
  policy, route set. `GET /v1/admin/tenants`, state changes via
  `PUT /v1/admin/tenants/{id}/state`.
- **Applications** -- AWS_IAM/SigV4 application grants
  (`GET /v1/admin/applications`). Necessarily partial: the JWT auth
  path has no equivalent registry to list.
- **Models / Route Sets** -- `GET /v1/admin/route-sets`, cross-referenced
  against M9's certification registry so an uncertified fallback is
  visibly flagged, not silently dropped.
- **Guardrails** -- which `guardrail_policy` each tenant is assigned,
  and what `BasicGuardrailClient` actually checks today (there's no
  per-policy rule config in the backend yet, so this doesn't pretend
  there is).
- **Usage / Cost** -- `GET /v1/admin/usage`, M8's showback/chargeback
  report with per-tenant budget utilization.

## Auth

The gateway has no real OIDC provider wired up yet (see
`bedrock-gateway-app/services/gateway/config.py` -- it falls back to a
per-process dev JWT keypair). Rather than fabricate a login flow the
gateway can't actually verify, this portal asks the operator to paste
in a `platform_admin`-scoped bearer token they already have (minted
the same way any other admin API caller gets one, e.g.
`scripts/generate_dev_token.py` run inside the gateway container via
`aws ecs execute-command`, or a real OIDC token once one exists). The
token is held in an HttpOnly cookie, never sent to the browser, and
attached server-side to every gateway call. Wire up a real IdP in
front of both the gateway and this portal before using it for anyone
who shouldn't have that token in cleartext at mint time.

## Local development

```bash
cp .env.example .env.local   # point GATEWAY_API_URL at a running gateway
npm install
npm run dev
```

`GATEWAY_API_URL` must be the gateway's open JWT route (bedrock-gateway-infra's
`api_gateway_url` output), not the `/iam/*` SigV4 route.

## Known limitations (MVP, not a production frontend)

- **Auth**: see above -- paste-a-token, not a real login flow.
- **Read-mostly**: the only mutation wired up is the tenant kill
  switch (the one write endpoint the gateway already exposes). Quota/
  budget/guardrail-policy edits, route-set edits, and model
  certification are all still policy-file + PR-review + redeploy,
  same as every other change to those files today -- this portal
  doesn't add a parallel write path around that review process.
- **npm audit** flags Next.js 14.2.35 (the latest 14.x patch release)
  against a broad upstream advisory range; the specific reachable
  issue is a build-time-only `postcss` dependency bundled inside
  `next` itself, not something in the deployed request-handling path.
  Clearing it fully means moving to Next 15 (async `cookies()`/
  `headers()`, `useActionState` instead of `useFormState`) -- a real
  but deliberately deferred follow-up, not done here to keep this an
  MVP-sized change.
