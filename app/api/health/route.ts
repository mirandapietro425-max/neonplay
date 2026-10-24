import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ status: "ok", service: "neonplay-games", timestamp: new Date().toISOString() });
}
