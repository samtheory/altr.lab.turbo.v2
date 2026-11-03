import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

export async function POST(request: Request) {
  return forwardUpstream(
    await proxyToJord("/admin/auth/email/send-test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: await request.text(),
    }),
  );
}
