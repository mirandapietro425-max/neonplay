import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ status: "ok", service: "zapgame-games", timestamp: new Date().toISOString() });
}
