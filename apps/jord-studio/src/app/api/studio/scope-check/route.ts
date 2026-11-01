/**
 * Test/helper: reject when cookie project ≠ x-jord-project header (S0045).
 */
import { cookies, headers } from "next/headers";

import { getSession } from "@/lib/auth/session";
import {
  PROJECT_COOKIE,
  PROJECT_HEADER,
  assertProjectScopeMatch,
} from "@/lib/project-scope";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const cookieStore = await cookies();
  const hdrs = await headers();
  const scope = assertProjectScopeMatch(
    cookieStore.get(PROJECT_COOKIE)?.value,
    hdrs.get(PROJECT_HEADER),
  );
  if (!scope.ok) {
    return Response.json(
      {
        error: scope.error,
        message:
          "Active project cookie does not match the requested project scope.",
      },
      { status: scope.status },
    );
  }
  return Response.json({ ok: true as const, slug: scope.slug });
}
