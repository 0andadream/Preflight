import { keccak256, toBytes } from "viem";
import { deterministicExplanation } from "@/lib/ai/explain";
import { buildRecord, hashRecord } from "@/lib/attestation/pdr";
import { intentFromRequest } from "@/lib/demo/scenarios";
import type { FirewallHit } from "@/lib/firewall/scan";
import {
  AGENT_ROSTER,
  MARKET_MAKER_AGENT,
  OKX_DEX_ROUTER,
  OPS_PAYOUT_AGENT,
  TREASURY_AGENT,
  TREASURY_VAULT,
  UNKNOWN_ADDRESS,
  VENDOR_DESK,
  formatAmount,
  policyForAgent,
} from "@/lib/policy/defaults";
import { demoBaseline } from "@/lib/behavior/anomaly";
import { evaluateTransaction } from "@/lib/rules/engine";
import { computeScore, decide, riskLabel } from "@/lib/scoring/score";
import type { HistoryEntry } from "@/lib/store/history";
import type { PreflightRequest } from "@/types";

export type SeedSpec = {
  id: string;
  at: string;
  headline: string;
  request: PreflightRequest;
};

export const SEED_CATALOG: SeedSpec[] = [
  {
    id: "healthy-treasury",
    at: "2026-08-18T15:01:00.000Z",
    headline: "Healthy treasury transfer",
    request: {
      agent: TREASURY_AGENT,
      action: "transfer",
      token: "USDT",
      amount: 500,
      recipient: TREASURY_VAULT,
    },
  },
  {
    id: "healthy-usdc",
    at: "2026-08-18T15:04:00.000Z",
    headline: "In-policy USDC to vault",
    request: {
      agent: TREASURY_AGENT,
      action: "transfer",
      token: "USDC",
      amount: 220,
      recipient: TREASURY_VAULT,
    },
  },
  {
    id: "healthy-maker",
    at: "2026-08-18T15:08:00.000Z",
    headline: "Market maker DEX swap",
    request: {
      agent: MARKET_MAKER_AGENT,
      action: "swap",
      token: "USDT",
      amount: 1500,
      recipient: OKX_DEX_ROUTER,
      contract: OKX_DEX_ROUTER,
      slippageBps: 40,
    },
  },
  {
    id: "healthy-ops",
    at: "2026-08-18T15:12:00.000Z",
    headline: "Ops vendor payout",
    request: {
      agent: OPS_PAYOUT_AGENT,
      action: "transfer",
      token: "USDT",
      amount: 80,
      recipient: VENDOR_DESK,
    },
  },
  {
    id: "warn-anomaly",
    at: "2026-08-18T15:18:00.000Z",
    headline: "Size above this agent's baseline",
    request: { agent: TREASURY_AGENT, scenario: "anomaly" },
  },
  {
    id: "warn-maker-value",
    at: "2026-08-18T15:22:00.000Z",
    headline: "Maker call with unexpected native value",
    request: {
      agent: MARKET_MAKER_AGENT,
      action: "contract",
      token: "USDT",
      amount: 400,
      recipient: OKX_DEX_ROUTER,
      contract: OKX_DEX_ROUTER,
      functionName: "rebalance",
      value: 0.05,
    },
  },
  {
    id: "block-over-limit",
    at: "2026-08-18T15:28:00.000Z",
    headline: "Over spend limit",
    request: { agent: TREASURY_AGENT, scenario: "over-limit" },
  },
  {
    id: "block-dvn",
    at: "2026-08-18T15:31:00.000Z",
    headline: "DVN threshold dropped",
    request: { agent: TREASURY_AGENT, scenario: "dvn-drop" },
  },
  {
    id: "block-ops-limit",
    at: "2026-08-18T15:36:00.000Z",
    headline: "Ops payout over $250 limit",
    request: {
      agent: OPS_PAYOUT_AGENT,
      action: "transfer",
      token: "USDT",
      amount: 800,
      recipient: VENDOR_DESK,
    },
  },
  {
    id: "block-approval",
    at: "2026-08-18T15:40:00.000Z",
    headline: "Unlimited approval to unknown",
    request: { agent: TREASURY_AGENT, scenario: "unlimited-approval" },
  },
  {
    id: "block-unknown-recipient",
    at: "2026-08-18T15:44:00.000Z",
    headline: "Unknown recipient",
    request: {
      agent: TREASURY_AGENT,
      action: "transfer",
      token: "USDT",
      amount: 200,
      recipient: UNKNOWN_ADDRESS,
    },
  },
  {
    id: "healthy-okb",
    at: "2026-08-18T15:50:00.000Z",
    headline: "Small OKB treasury move",
    request: {
      agent: TREASURY_AGENT,
      action: "transfer",
      token: "OKB",
      amount: 40,
      recipient: TREASURY_VAULT,
    },
  },
];

function addressFor(agent: string) {
  return AGENT_ROSTER.find((a) => a.name === agent)?.address ?? TREASURY_VAULT;
}

export function buildSeedHistory(): HistoryEntry[] {
  return SEED_CATALOG.map((spec) => {
    const built = evaluateSeed(spec);
    return {
      id: built.policyHash,
      at: spec.at,
      decision: built.decision,
      score: built.score,
      policyHash: built.policyHash,
      agent: built.intent.agent,
      action: built.intent.action,
      amount: built.intent.amount,
      amountLabel: formatAmount(built.intent.amount),
      token: built.intent.token,
      recipient: built.intent.recipient,
      simulated: Boolean(spec.request.scenario && spec.request.scenario !== "safe"),
      demo: true,
      headline: spec.headline,
    };
  }).sort((a, b) => (a.at < b.at ? 1 : -1));
}

export function buildSeedFirewallHits(): FirewallHit[] {
  return SEED_CATALOG.map((spec, i) => {
    const built = evaluateSeed(spec);
    const from = addressFor(built.intent.agent);
    const hash = keccak256(toBytes(`preflight-seed:${spec.id}`));
    return {
      hash,
      explorerUrl: "",
      blockNumber: 38_620_100 + i,
      from,
      to: (built.intent.recipient || built.intent.contract || null) as `0x${string}` | null,
      agent: built.intent.agent,
      registered: true,
      chainId: 1952,
      chainLabel: "X Layer Testnet",
      intent: built.intent,
      decision: built.decision,
      score: built.score,
      riskLabel: riskLabel(built.score, built.decision),
      checks: built.checks,
      gated: built.decision === "ALLOW",
      kind: "spend" as const,
      demo: true,
    };
  }).sort((a, b) => b.blockNumber - a.blockNumber);
}

export function evaluateSeed(spec: SeedSpec) {
  const intent = intentFromRequest({ ...spec.request, agent: spec.request.agent });
  const policy = policyForAgent(intent.agent);
  const history = spec.request.scenario === "anomaly" ? demoBaseline(intent.agent) : [];
  const checks = evaluateTransaction(intent, policy, history);
  const scoreBreakdown = computeScore(checks);
  const decision = decide(checks);
  const record = buildRecord({
    timestamp: spec.at,
    intent,
    checks,
    policy,
    score: scoreBreakdown.total,
    decision,
  });
  const explained = deterministicExplanation({
    decision,
    score: scoreBreakdown.total,
    checks,
    intent,
  });
  return {
    intent,
    policy,
    checks,
    decision,
    score: scoreBreakdown.total,
    policyHash: hashRecord(record),
    explanation: explained.summary,
    headline: spec.headline,
  };
}
