import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

export async function POST() {
  return forwardUpstream(
    await proxyToJord("/admin/auth/jwt/rotate", { method: "POST" }),
  );
}
