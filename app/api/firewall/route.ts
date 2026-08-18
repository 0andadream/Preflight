import { NextResponse } from "next/server";
import { scanFirewall } from "@/lib/firewall/scan";

export const runtime = "nodejs";

let cache: { at: number; body: unknown } | null = null;

export async function GET(req: Request) {
  const lookback = Number(new URL(req.url).searchParams.get("blocks") || 40);
  const now = Date.now();
  if (cache && now - cache.at < 6000) {
    return NextResponse.json(cache.body);
  }
  try {
    const body = await scanFirewall(Math.min(Math.max(lookback, 8), 80));
    cache = { at: now, body };
    return NextResponse.json(body);
  } catch (err) {
    const reason = err instanceof Error ? err.message : "scan failed";
    return NextResponse.json({ error: reason }, { status: 502 });
  }
}
