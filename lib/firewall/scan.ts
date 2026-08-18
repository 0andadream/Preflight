import { createPublicClient, fallback, http, type Hex } from "viem";
import { explorerTx, xLayerTestnet } from "@/lib/chains";
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

export type FirewallHit = {
  hash: `0x${string}`;
  explorerUrl: string;
  blockNumber: number;
  from: `0x${string}`;
  to: `0x${string}` | null;
  agent: string;
  intent: TransactionIntent;
  decision: Decision;
  score: number;
  riskLabel: RiskLabel;
  checks: RuleResult[];
  gated: boolean;
  kind: "spend" | "attestation";
};

function client() {
  return createPublicClient({
    chain: xLayerTestnet,
    transport: fallback(
      xLayerTestnet.rpcUrls.default.http.map((url) => http(url, { timeout: 10_000 })),
    ),
  });
}

export async function scanFirewall(lookback = 40): Promise<{
  chainId: number;
  chainLabel: string;
  head: number;
  agents: RegisteredAgent[];
  hits: FirewallHit[];
}> {
  const agents = await listAgents();
  const watched = new Set(agents.map((a) => a.address.toLowerCase()));
  const publicClient = client();
  const head = await publicClient.getBlockNumber();
  const fromBlock = head > BigInt(lookback) ? head - BigInt(lookback) : 0n;

  const blocks = await Promise.all(
    range(fromBlock, head).map((n) =>
      publicClient.getBlock({ blockNumber: n, includeTransactions: true }).catch(() => null),
    ),
  );

  const observed: ObservedTx[] = [];
  for (const block of blocks) {
    if (!block) continue;
    for (const tx of block.transactions) {
      if (typeof tx === "string") continue;
      if (!tx.from || !watched.has(tx.from.toLowerCase())) continue;
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

  const allowByAgent = new Set<string>();
  for (const tx of observed) {
    if (tx.to?.toLowerCase() === ATTESTATION.toLowerCase() && isAttestationCall(tx.input)) {
      const reg = agentByAddress(agents, tx.from);
      if (reg) allowByAgent.add(reg.agent);
    }
  }

  const hits: FirewallHit[] = observed
    .map((tx) => {
      const reg = agentByAddress(agents, tx.from);
      const name = reg?.agent || `Agent ${shortAddress(tx.from)}`;
      const kind: FirewallHit["kind"] =
        tx.to?.toLowerCase() === ATTESTATION.toLowerCase() && isAttestationCall(tx.input)
          ? "attestation"
          : "spend";
      const intent = decodeObservedTx(tx, name, xLayerTestnet.id);
      const policy = policyForAgent(name);
      const history = name === TREASURY_AGENT ? demoBaseline(name) : [];
      const gate = preflightGate({
        isAttestationWrite: kind === "attestation",
        hadAllow: allowByAgent.has(name),
      });
      const checks =
        kind === "attestation" ? [gate] : [...evaluateTransaction(intent, policy, history), gate];
      const decision = decide(checks);
      const score = computeScore(checks).total;
      return {
        hash: tx.hash,
        explorerUrl: explorerTx(xLayerTestnet.id, tx.hash),
        blockNumber: Number(tx.blockNumber),
        from: tx.from,
        to: tx.to,
        agent: name,
        intent,
        decision,
        score,
        riskLabel: riskLabel(score, decision),
        checks,
        gated: gate.status === "PASS",
        kind,
      };
    })
    .sort((a, b) => b.blockNumber - a.blockNumber);

  return {
    chainId: xLayerTestnet.id,
    chainLabel: "X Layer Testnet",
    head: Number(head),
    agents,
    hits,
  };
}

function range(from: bigint, to: bigint) {
  const out: bigint[] = [];
  for (let n = from; n <= to; n++) out.push(n);
  return out;
}
