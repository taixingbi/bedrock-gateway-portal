"use client";

import { useFormState, useFormStatus } from "react-dom";
import { login } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
    >
      {pending ? "Checking..." : "Sign in"}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(login, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-sm">
        <h1 className="text-lg font-semibold">Bedrock Gateway Portal</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste a <code className="rounded bg-muted px-1 py-0.5">platform_admin</code> bearer
          token. There&apos;s no separate login for this yet -- the gateway doesn&apos;t have a
          real OIDC provider wired up, only its dev JWT keypair (see{" "}
          <code className="rounded bg-muted px-1 py-0.5">scripts/generate_dev_token.py</code> in
          bedrock-gateway-app).
        </p>

        <form action={formAction} className="mt-5 space-y-3">
          <textarea
            name="token"
            rows={4}
            required
            placeholder="eyJhbGciOi..."
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-primary"
          />
          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          <SubmitButton />
        </form>
      </div>
    </div>
  );
}
