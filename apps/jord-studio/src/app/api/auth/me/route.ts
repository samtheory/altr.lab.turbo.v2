import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "unauthorized", message: "Not signed in" },
      { status: 401 },
    );
  }
  return NextResponse.json({
    role: session.role,
    bypass: session.bypass,
  });
}
