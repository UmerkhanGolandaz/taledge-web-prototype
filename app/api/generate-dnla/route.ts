import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "DNLA scoring is not connected yet. Use the DNLA import workflow once the provider integration is available.",
    },
    { status: 503 }
  );
}
