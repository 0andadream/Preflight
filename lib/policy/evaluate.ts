import { DEMO_POLICY } from "@/lib/layerzero/networks";
import type { AgentPolicy, RuleResult, TransactionIntent } from "@/types";

export function policyForAgent(_agent: string): AgentPolicy {
  return {
    maxTransferAmount: DEMO_POLICY.maxTransferAmount,
    allowedDestinations: [...DEMO_POLICY.allowedDestinations],
    allowedTokens: [...DEMO_POLICY.allowedTokens],
  };
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

export function evaluatePolicy(policy: AgentPolicy, intent: TransactionIntent): RuleResult[] {
  const destOk = policy.allowedDestinations.some((d) => normalize(d) === normalize(intent.destinationChain));
  const tokenOk =
    policy.allowedTokens.length === 0 ||
    policy.allowedTokens.some((t) => normalize(t) === normalize(intent.token));
  const amountOk = intent.amount <= policy.maxTransferAmount;

  const amount: RuleResult = {
    id: "agent_policy_amount",
    name: "Agent Policy",
    status: amountOk ? "PASS" : "FAIL",
    severity: "CRITICAL",
    expected: `≤ $${policy.maxTransferAmount.toLocaleString()}`,
    actual: `$${intent.amount.toLocaleString()}`,
    explanation: amountOk
      ? "Requested amount is within the agent's configured transfer limit."
      : `Requested amount exceeds the agent's configured $${policy.maxTransferAmount.toLocaleString()} limit.`,
  };

  const dest: RuleResult = {
    id: "agent_policy_destination",
    name: "Allowed Destination",
    status: destOk ? "PASS" : "FAIL",
    severity: "CRITICAL",
    expected: policy.allowedDestinations.join(", "),
    actual: intent.destinationChain,
    explanation: destOk
      ? "Destination is in the agent's allowlist."
      : `Destination ${intent.destinationChain} is not in the agent's allowlist.`,
  };

  const token: RuleResult = {
    id: "agent_policy_token",
    name: "Allowed Token",
    status: tokenOk ? "PASS" : "FAIL",
    severity: "HIGH",
    expected: policy.allowedTokens.join(", ") || "any",
    actual: intent.token,
    explanation: tokenOk
      ? "Token is permitted by the agent policy."
      : `Token ${intent.token} is not permitted by the agent policy.`,
  };

  return [amount, dest, token];
}
