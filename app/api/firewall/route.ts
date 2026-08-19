import { NextResponse } from "next/server";
import { buildSeedFirewallHits } from "@/lib/demo/catalog";
import { scanFirewall, type FirewallScan } from "@/lib/firewall/scan";

export const runtime = "nodejs";

const cache = new Map<number, { at: number; body: unknown }>();
const inflight = new Map<number, Promise<unknown>>();

function withSeed(live: FirewallScan): FirewallScan {
  const demo = buildSeedFirewallHits();
  const seen = new Set(demo.map((h) => h.hash));
  const liveHits = live.hits.filter((h) => !seen.has(h.hash));
  const demoSenders = new Set(demo.map((h) => h.from.toLowerCase())).size;
  return {
    ...live,
    hits: [...demo, ...liveHits].slice(0, 250),
    scanned: {
      blocks: live.scanned.blocks,
      senders: live.scanned.senders + demoSenders,
      txs: live.scanned.txs + demo.length,
    },
  };
}

export async function GET(req: Request) {
  const lookback = Math.min(
    Math.max(Number(new URL(req.url).searchParams.get("blocks") || (process.env.VERCEL ? 8 : 24)), 8),
    48,
  );
  const now = Date.now();
  const hit = cache.get(lookback);
  if (hit && now - hit.at < 10_000) {
    return NextResponse.json(hit.body);
  }

  let pending = inflight.get(lookback);
  if (!pending) {
    pending = scanFirewall(lookback)
      .then((body) => withSeed(body))
      .catch((err) => {
        const reason = err instanceof Error ? err.message : "scan failed";
        const demo = buildSeedFirewallHits();
        return {
          chainId: 196,
          chainLabel: "X Layer",
          head: 0,
          agents: [],
          hits: demo,
          chains: [],
          scanned: { blocks: lookback, senders: new Set(demo.map((h) => h.from)).size, txs: demo.length },
          error: reason,
        };
      })
      .then((body) => {
        cache.set(lookback, { at: Date.now(), body });
        return body;
      })
      .finally(() => inflight.delete(lookback));
    inflight.set(lookback, pending);
  }

  return NextResponse.json(await pending);
}
