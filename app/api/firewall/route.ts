import { NextResponse } from "next/server";
import { scanFirewall } from "@/lib/firewall/scan";

export const runtime = "nodejs";

const cache = new Map<number, { at: number; body: unknown }>();
const inflight = new Map<number, Promise<unknown>>();

export async function GET(req: Request) {
  const lookback = Math.min(Math.max(Number(new URL(req.url).searchParams.get("blocks") || 24), 8), 48);
  const now = Date.now();
  const hit = cache.get(lookback);
  if (hit && now - hit.at < 10_000) {
    return NextResponse.json(hit.body);
  }

  let pending = inflight.get(lookback);
  if (!pending) {
    pending = scanFirewall(lookback)
      .then((body) => {
        cache.set(lookback, { at: Date.now(), body });
        return body;
      })
      .finally(() => inflight.delete(lookback));
    inflight.set(lookback, pending);
  }

  try {
    return NextResponse.json(await pending);
  } catch (err) {
    const reason = err instanceof Error ? err.message : "scan failed";
    return NextResponse.json({ error: reason }, { status: 502 });
  }
}
