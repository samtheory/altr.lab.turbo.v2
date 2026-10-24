import { forwardUpstream, proxyToJord } from "@/lib/jord-proxy";

type Params = { params: Promise<{ bucket: string; key: string }> };

function objectPath(bucket: string, key: string): string {
  return `/blobs/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(key)}`;
}

export async function GET(request: Request, { params }: Params) {
  const { bucket, key } = await params;
  const decoded = decodeURIComponent(key);
  const upstream = await proxyToJord(objectPath(bucket, decoded), {
    method: "GET",
    headers: request.headers,
  });
  return forwardUpstream(upstream);
}

export async function PUT(request: Request, { params }: Params) {
  const { bucket, key } = await params;
  const decoded = decodeURIComponent(key);
  const contentType = request.headers.get("content-type") ?? "application/octet-stream";
  const body = await request.arrayBuffer();
  const upstream = await proxyToJord(objectPath(bucket, decoded), {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body,
  });
  return forwardUpstream(upstream);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { bucket, key } = await params;
  const decoded = decodeURIComponent(key);
  const upstream = await proxyToJord(objectPath(bucket, decoded), {
    method: "DELETE",
  });
  return forwardUpstream(upstream);
}
