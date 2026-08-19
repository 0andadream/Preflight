import { createPublicClient, fallback, http, type Chain, type Hex } from "viem";
import { explorerTx, xLayer, xLayerTestnet } from "@/lib/chains";
import { demoBaseline } from "@/lib/behavior/anomaly";
import { decodeObservedTx, isAttestationCall, type ObservedTx } from "@/lib/firewall/decode";
import { preflightGate } from "@/lib/firewall/gate";
import { agentByAddress, listAgents, type RegisteredAgent } from "@/lib/firewall/registry";
import { TREASURY_AGENT, policyForAgent, shortAddress } from "@/lib/policy/defaults";
import { evaluateTransaction } from "@/lib/rules/engine";
import { computeScore, decide, riskLabel } from "@/lib/scoring/score";
import type { Decision, RiskLabel, RuleResult, TransactionIntent } from "@/types";

const ATTESTATION = (process.env.NEXT_PUBLIC_ATTESTATION_ADDRESS ||
  "0xe366979430FA3874DfBFAf7579484D5F8a1aBB1D") as `0x${string}`;

const MAX_HITS = 250;
const BATCH = 8;

export type FirewallHit = {
  hash: `0x${string}`;
  explorerUrl: string;
  blockNumber: number;
  from: `0x${string}`;
  to: `0x${string}` | null;
  agent: string;
  registered: boolean;
  chainId: number;
  chainLabel: string;
  intent: TransactionIntent;
  decision: Decision;
  score: number;
  riskLabel: RiskLabel;
  checks: RuleResult[];
  gated: boolean;
  kind: "spend" | "attestation";
};

export type ChainScan = {
  chainId: number;
  chainLabel: string;
  head: number;
  senders: number;
  txs: number;
  error?: string;
};

export type FirewallScan = {
  chainId: number;
  chainLabel: string;
  head: number;
  agents: RegisteredAgent[];
  hits: FirewallHit[];
  chains: ChainScan[];
  scanned: { blocks: number; senders: number; txs: number };
};

function clientFor(chain: Chain) {
  return createPublicClient({
    chain,
    transport: fallback(chain.rpcUrls.default.http.map((url) => http(url, { timeout: 12_000 }))),
  });
}

export function nameAgent(from: string, named: RegisteredAgent[]): { agent: string; registered: boolean } {
  const reg = agentByAddress(named, from);
  if (reg) return { agent: reg.agent, registered: true };
  return { agent: `Agent ${shortAddress(from)}`, registered: false };
}

export function evaluateObserved(input: {
  tx: ObservedTx;
  chain: Pick<Chain, "id" | "name">;
  named: RegisteredAgent[];
  allowByFrom: Set<string>;
}): FirewallHit {
  const { tx, chain, named, allowByFrom } = input;
  const { agent, registered } = nameAgent(tx.from, named);
  const kind: FirewallHit["kind"] =
    tx.to?.toLowerCase() === ATTESTATION.toLowerCase() && isAttestationCall(tx.input)
      ? "attestation"
      : "spend";
  const intent = decodeObservedTx(tx, agent, chain.id);
  const history = agent === TREASURY_AGENT ? demoBaseline(agent) : [];
  const gate = preflightGate({
    isAttestationWrite: kind === "attestation",
    hadAllow: allowByFrom.has(tx.from.toLowerCase()),
  });
  const checks =
    kind === "attestation"
      ? [gate]
      : registered
        ? [...evaluateTransaction(intent, policyForAgent(agent), history), gate]
        : [gate];
  const decision = decide(checks);
  const score = computeScore(checks).total;
  return {
    hash: tx.hash,
    explorerUrl: explorerTx(chain.id, tx.hash),
    blockNumber: Number(tx.blockNumber),
    from: tx.from,
    to: tx.to,
    agent,
    registered,
    chainId: chain.id,
    chainLabel: chain.name,
    intent,
    decision,
    score,
    riskLabel: riskLabel(score, decision),
    checks,
    gated: gate.status === "PASS",
    kind,
  };
}

export async function scanFirewall(lookback = 24): Promise<FirewallScan> {
  const named = await listAgents();
  const windows = await Promise.all([
    scanChain(xLayer, lookback, named),
    scanChain(xLayerTestnet, lookback, named),
  ]);

  const byChain = new Map<number, FirewallHit[]>();
  for (const window of windows) {
    const ranked = [...window.hits].sort((a, b) => b.blockNumber - a.blockNumber);
    byChain.set(window.chainId, ranked);
  }
  const mainnet = (byChain.get(xLayer.id) ?? []).slice(0, 200);
  const testnet = (byChain.get(xLayerTestnet.id) ?? []).slice(0, 50);
  const hits = [...mainnet, ...testnet].slice(0, MAX_HITS);

  return {
    chainId: xLayer.id,
    chainLabel: "X Layer",
    head: windows[0]?.head ?? 0,
    agents: mergeAgents(named, hits),
    hits,
    chains: windows.map(({ hits: _hits, ...meta }) => meta),
    scanned: {
      blocks: lookback,
      senders: windows.reduce((n, w) => n + w.senders, 0),
      txs: windows.reduce((n, w) => n + w.txs, 0),
    },
  };
}

async function scanChain(
  chain: Chain,
  lookback: number,
  named: RegisteredAgent[],
): Promise<ChainScan & { hits: FirewallHit[] }> {
  const publicClient = clientFor(chain);
  try {
    const head = await publicClient.getBlockNumber();
    const fromBlock = head > BigInt(lookback) ? head - BigInt(lookback) : 0n;
    const blocks = await mapPool(range(fromBlock, head), BATCH, (n) =>
      publicClient.getBlock({ blockNumber: n, includeTransactions: true }).catch(() => null),
    );

    const observed: ObservedTx[] = [];
    for (const block of blocks) {
      if (!block) continue;
      for (const tx of block.transactions) {
        if (typeof tx === "string" || !tx.from) continue;
        observed.push({
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          input: (tx.input || "0x") as Hex,
          value: tx.value,
          blockNumber: block.number ?? 0n,
        });
      }
    }

    const allowByFrom = new Set<string>();
    for (const tx of observed) {
      if (tx.to?.toLowerCase() === ATTESTATION.toLowerCase() && isAttestationCall(tx.input)) {
        allowByFrom.add(tx.from.toLowerCase());
      }
    }

    const hits = observed.map((tx) => evaluateObserved({ tx, chain, named, allowByFrom }));
    const senders = new Set(observed.map((tx) => tx.from.toLowerCase()));

    return {
      chainId: chain.id,
      chainLabel: chain.name,
      head: Number(head),
      senders: senders.size,
      txs: observed.length,
      hits,
    };
  } catch (err) {
    return {
      chainId: chain.id,
      chainLabel: chain.name,
      head: 0,
      senders: 0,
      txs: 0,
      hits: [],
      error: err instanceof Error ? err.message : "scan failed",
    };
  }
}

function mergeAgents(named: RegisteredAgent[], hits: FirewallHit[]): RegisteredAgent[] {
  const byAddr = new Map<string, RegisteredAgent>();
  for (const row of named) byAddr.set(`${row.chainId}:${row.address.toLowerCase()}`, row);
  for (const hit of hits) {
    const key = `${hit.chainId}:${hit.from.toLowerCase()}`;
    if (byAddr.has(key)) continue;
    byAddr.set(key, {
      address: hit.from,
      agent: hit.agent,
      chainId: hit.chainId,
    });
  }
  return [...byAddr.values()];
}

function range(from: bigint, to: bigint) {
  const out: bigint[] = [];
  for (let n = from; n <= to; n++) out.push(n);
  return out;
}

async function mapPool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, () => worker()));
  return out;
}
