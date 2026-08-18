import { keccak256, toBytes } from "viem";
import type { AgentPolicy, Decision, PolicyDecisionRecord, RuleResult, TransactionIntent } from "@/types";

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = stable((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

export function buildRecord(input: {
  timestamp: string;
  intent: TransactionIntent;
  sourceChainId: number;
  checks: RuleResult[];
  policy: AgentPolicy;
  score: number;
  decision: Decision;
}): PolicyDecisionRecord {
  return {
    version: "1.0",
    timestamp: input.timestamp,
    agent: input.intent.agent,
    sourceChain: input.intent.sourceChain,
    sourceChainId: input.sourceChainId,
    destinationChain: input.intent.destinationChain,
    asset: input.intent.token,
    amount: String(input.intent.amount),
    checks: input.checks,
    policy: input.policy,
    score: input.score,
    decision: input.decision,
  };
}

export function serializeRecord(record: PolicyDecisionRecord): string {
  return JSON.stringify(stable(record));
}

export function hashRecord(record: PolicyDecisionRecord): `0x${string}` {
  return keccak256(toBytes(serializeRecord(record)));
}
