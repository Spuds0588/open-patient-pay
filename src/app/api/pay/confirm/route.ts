import { NextResponse } from "next/server";
import { reconcileCheckoutSession } from "@/lib/payments";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id." }, { status: 400 });
  }

  const result = await reconcileCheckoutSession(sessionId);
  return NextResponse.json(result);
}
