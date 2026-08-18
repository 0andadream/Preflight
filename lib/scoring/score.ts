import type { Decision, RiskLabel, RuleResult, ScoreBreakdown } from "@/types";

const FAIL_PENALTY = {
  CRITICAL: 35,
  HIGH: 15,
  MEDIUM: 8,
  LOW: 3,
} as const;

const WARN_PENALTY = {
  CRITICAL: 15,
  HIGH: 8,
  MEDIUM: 4,
  LOW: 1,
} as const;

const POLICY_IDS = new Set(["agent_policy_amount", "agent_policy_destination", "agent_policy_token"]);

export function computeScore(checks: RuleResult[]): ScoreBreakdown {
  const penalties: ScoreBreakdown["penalties"] = [];
  let usedPolicyPenalty = false;

  for (const check of checks) {
    if (check.status === "PASS") continue;

    if (POLICY_IDS.has(check.id) && check.status === "FAIL") {
      if (!usedPolicyPenalty) {
        penalties.push({ reason: "Policy violation", delta: -25 });
        usedPolicyPenalty = true;
      }
      continue;
    }

    const table = check.status === "FAIL" ? FAIL_PENALTY : WARN_PENALTY;
    const delta = -table[check.severity];
    penalties.push({ reason: `${check.name} ${check.status}`, delta });
  }

  const raw = 100 + penalties.reduce((sum, p) => sum + p.delta, 0);
  return {
    start: 100,
    penalties,
    total: Math.max(0, Math.min(100, raw)),
  };
}

export function decide(checks: RuleResult[]): Decision {
  const fails = checks.filter((c) => c.status === "FAIL");
  if (fails.some((c) => c.severity === "CRITICAL" || c.severity === "HIGH")) return "BLOCK";
  if (fails.some((c) => c.severity === "MEDIUM")) return "WARN";
  if (checks.some((c) => c.status === "WARN" && (c.severity === "MEDIUM" || c.severity === "HIGH"))) {
    return "WARN";
  }
  return "ALLOW";
}

export function riskLabel(score: number, decision: Decision): RiskLabel {
  if (decision === "BLOCK" || score < 50) return "HIGH RISK";
  if (decision === "WARN" || score < 80) return "ELEVATED";
  return "SAFE";
}
