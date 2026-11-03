import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

type Params = { params: Promise<{ bucket: string; key: string }> };

export async function POST(request: Request, { params }: Params) {
  const { bucket, key } = await params;
  const decoded = decodeURIComponent(key);
  const upstream = await proxyToJord(
    `/blobs/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(decoded)}/sign`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: await request.text(),
    },
  );
  return forwardUpstream(upstream);
}
