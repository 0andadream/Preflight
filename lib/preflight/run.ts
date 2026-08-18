import { explainWithModel } from "@/lib/ai/explain";
import { writeAttestation } from "@/lib/attestation/client";
import { buildRecord, hashRecord } from "@/lib/attestation/pdr";
import { demoBaseline } from "@/lib/behavior/anomaly";
import { intentFromRequest } from "@/lib/demo/scenarios";
import { DEMO_AGENT, policyForAgent } from "@/lib/policy/defaults";
import { evaluateTransaction } from "@/lib/rules/engine";
import { computeScore, decide, riskLabel } from "@/lib/scoring/score";
import { listAgentHistory } from "@/lib/store/history";
import type { PreflightRequest, PreflightResult } from "@/types";

export async function runPreflight(input: PreflightRequest): Promise<PreflightResult> {
  const intent = intentFromRequest(input);
  const policy = policyForAgent(intent.agent);
  const recorded = await listAgentHistory(intent.agent);
  const history =
    input.scenario === "anomaly"
      ? demoBaseline(intent.agent)
      : intent.agent === DEMO_AGENT && recorded.length < 3
        ? [...demoBaseline(intent.agent), ...recorded]
        : recorded;
  const checks = evaluateTransaction(intent, policy, history);
  const scoreBreakdown = computeScore(checks);
  const decision = decide(checks);
  const score = scoreBreakdown.total;
  const record = buildRecord({
    timestamp: new Date().toISOString(),
    intent,
    checks,
    policy,
    score,
    decision,
  });
  const policyHash = hashRecord(record);
  const explained = await explainWithModel({ decision, score, checks, intent });

  const attestation =
    input.attest === false
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
    source: input.scenario && input.scenario !== "safe" ? "simulation" : "evaluated",
    scoreBreakdown,
    record,
    attestation,
  };
}
