import { explainWithModel } from "@/lib/ai/explain";
import { writeAttestation } from "@/lib/attestation/client";
import { buildRecord, hashRecord } from "@/lib/attestation/pdr";
import { driftedIntent } from "@/lib/demo/snapshot";
import { loadConfig } from "@/lib/layerzero/reader";
import { DEMO_AGENT, resolveNetwork, USDT0_XLAYER, XLAYER } from "@/lib/layerzero/networks";
import { evaluatePolicy, policyForAgent } from "@/lib/policy/evaluate";
import { evaluateSecurityRules } from "@/lib/rules/engine";
import { computeScore, decide, riskLabel } from "@/lib/scoring/score";
import type { PreflightRequest, PreflightResult, TransactionIntent } from "@/types";

function normalizeIntent(input: PreflightRequest): TransactionIntent {
  const dest = resolveNetwork(input.destinationChain);
  const source = resolveNetwork(input.sourceChain);
  return {
    agent: input.agent?.trim() || DEMO_AGENT,
    token: (input.token || "USDT0").replace("₮", "T").toUpperCase(),
    amount: Number(input.amount),
    sourceChain: source?.label ?? "X Layer",
    destinationChain: dest?.label ?? input.destinationChain,
  };
}

export async function runPreflight(input: PreflightRequest): Promise<PreflightResult> {
  let intent = normalizeIntent(input);
  if (input.simulateDrift) intent = driftedIntent(intent);

  const policy = policyForAgent(intent.agent);
  const observed = await loadConfig(intent, Boolean(input.simulateDrift));
  const security = evaluateSecurityRules(observed, undefined, intent);
  const policyChecks = evaluatePolicy(policy, intent);
  const checks = [...security, ...policyChecks];
  const scoreBreakdown = computeScore(checks);
  const decision = decide(checks);
  const score = scoreBreakdown.total;
  const record = buildRecord({
    timestamp: new Date().toISOString(),
    intent,
    sourceChainId: observed.sourceChainId || XLAYER.chainId,
    checks,
    policy,
    score,
    decision,
  });
  const policyHash = hashRecord(record);
  const explained = await explainWithModel({ decision, score, checks, intent, observed });

  const attestation = input.attest === false
    ? {
        written: false,
        simulated: false as const,
        chainId: 1952,
        chainLabel: "X Layer Testnet",
        policyHash,
        reason: "Attestation skipped.",
      }
    : await writeAttestation({
        policyHash,
        decision,
        score,
        agent: intent.agent,
      });

  return {
    decision,
    score,
    riskLabel: riskLabel(score, decision),
    policyHash,
    checks,
    explanation: explained.summary,
    mainRisk: explained.mainRisk,
    remediation: explained.remediation,
    explanationSource: explained.source,
    intent,
    policy,
    observed: {
      ...observed,
      tokenSymbol: observed.tokenSymbol || USDT0_XLAYER.symbol,
    },
    scoreBreakdown,
    record,
    attestation,
  };
}
