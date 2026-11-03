import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

export async function GET() {
  return forwardUpstream(await proxyToJord("/admin/auth/settings"));
}

export async function PATCH(request: Request) {
  return forwardUpstream(
    await proxyToJord("/admin/auth/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: await request.text(),
    }),
  );
}
