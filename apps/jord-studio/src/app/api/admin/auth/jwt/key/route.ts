import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

export async function DELETE() {
  return forwardUpstream(
    await proxyToJord("/admin/auth/jwt/key", { method: "DELETE" }),
  );
}
