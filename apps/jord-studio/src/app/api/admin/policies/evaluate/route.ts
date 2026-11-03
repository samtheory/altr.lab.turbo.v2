import { getSession } from "@/lib/auth/session";
import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";
import { validateEvaluateBody } from "@/lib/studio-policy-tester";

/** Policy tester BFF (S0077): admin session only, shape-checked, proxied. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json(
      { error: "unauthorized", message: "Sign in to Studio first." },
      { status: 401 },
    );
  }
  if (session.role !== "admin") {
    return Response.json(
      { error: "forbidden", message: "Only admins can run policy tests." },
      { status: 403 },
    );
  }
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json(
      { error: "invalid_request", message: "Body must be valid JSON." },
      { status: 400 },
    );
  }
  const parsed = validateEvaluateBody(raw);
  if (!parsed.ok) {
    return Response.json(
      { error: "invalid_request", message: parsed.message },
      { status: 400 },
    );
  }
  return forwardUpstream(
    await proxyToJord("/admin/policies/evaluate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed.body),
    }),
  );
}
