import { auth } from "@/lib/firebase";

/**
 * Client-safe fetch wrapper.
 *
 * When a Firebase user is signed in, attaches an `Authorization: Bearer <idToken>`
 * header carrying the current user's ID token so server routes (see
 * `lib/server-auth.ts`) can resolve the authenticated principal.
 *
 * When no user is signed in (demo flows), it falls back to a plain `fetch` so
 * unauthenticated/demo journeys keep working unchanged.
 *
 * Resilience: token retrieval is best-effort. If reading the token throws for
 * any reason, we never propagate the error - we fall back to a plain `fetch`.
 *
 * This module is browser-safe and dependency-free: it does NOT import any
 * server-only code, so it can be used from client components.
 */
export async function authedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  let token: string | undefined;

  try {
    // `auth` is SSR-guarded in lib/firebase and may be undefined on the server.
    const currentUser = auth?.currentUser;
    if (currentUser) {
      token = await currentUser.getIdToken();
    }
  } catch {
    // Never throw on token retrieval failure - fall back to plain fetch.
    token = undefined;
  }

  if (!token) {
    // No Firebase user: an invited (account-less) candidate authenticates with
    // the invite token the recruiter/university issued them (persisted at
    // onboarding). Attach it so server routes can resolve an invite-scoped
    // principal - without this, the interview + scoring routes 401 in enforced
    // mode and the candidate's whole assessment is lost.
    const invite = readInviteToken();
    if (invite) {
      const headers = new Headers(init?.headers);
      headers.set("X-Invite-Token", invite);
      return fetch(input, { ...init, headers });
    }
    return fetch(input, init);
  }

  // Merge the Authorization header without clobbering caller-provided headers.
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);

  return fetch(input, { ...init, headers });
}

/**
 * Read the invite token an invited candidate is operating under, from the
 * onboarding-persisted workspace profile. Browser-only and best-effort.
 */
function readInviteToken(): string | undefined {
  try {
    if (typeof localStorage === "undefined") return undefined;
    const raw =
      localStorage.getItem("taledge:workspace-profile") ||
      localStorage.getItem("taledge:demo-profile");
    if (!raw) return undefined;
    const p = JSON.parse(raw);
    return typeof p?.inviteToken === "string" && p.inviteToken ? p.inviteToken : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Convenience helper: POST a JSON body via `authedFetch`.
 *
 * Sets `Content-Type: application/json` and serializes `body`, while still
 * honoring any caller-supplied headers/options via `init`.
 */
export async function postJson(
  url: RequestInfo | URL,
  body: unknown,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return authedFetch(url, {
    method: "POST",
    ...init,
    headers,
    body: JSON.stringify(body),
  });
}
