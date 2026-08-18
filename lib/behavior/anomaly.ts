import { formatAmount, isUnlimited, labelAddress } from "@/lib/policy/defaults";
import type { RuleResult, TransactionIntent, TxAction } from "@/types";

export type BehaviorEvent = {
  agent: string;
  action: TxAction;
  amount: number;
  token: string;
  recipient: string;
};

export function evaluateBehavior(intent: TransactionIntent, history: BehaviorEvent[]): RuleResult {
  const prior = history.filter((h) => h.agent === intent.agent);
  if (prior.length < 3) {
    return {
      id: "behavioral_anomaly",
      name: "Behavioral Anomaly",
      status: "PASS",
      severity: "MEDIUM",
      expected: "≥ 3 prior events for a baseline",
      actual: `${prior.length} prior`,
      explanation: "Not enough history to score a deviation. Policy rules still apply.",
    };
  }

  const sameToken = prior.filter((h) => h.token.toUpperCase() === intent.token.toUpperCase() && h.amount >= 0);
  const amounts = sameToken.map((h) => h.amount).sort((a, b) => a - b);
  const median = amounts.length ? amounts[Math.floor(amounts.length / 2)] : 0;
  const seenRecipients = new Set(prior.map((h) => h.recipient.toLowerCase()));
  const seenActions = new Set(prior.map((h) => h.action));

  if (!isUnlimited(intent.amount) && median > 0 && intent.amount >= median * 2.5) {
    return {
      id: "behavioral_anomaly",
      name: "Behavioral Anomaly",
      status: "WARN",
      severity: "HIGH",
      expected: `≤ 2.5× median (${formatAmount(median, intent.token)})`,
      actual: formatAmount(intent.amount, intent.token),
      explanation: `Amount is ${(intent.amount / median).toFixed(1)}× this agent's typical ${intent.token} size.`,
    };
  }

  if (intent.recipient && !seenRecipients.has(intent.recipient.toLowerCase())) {
    return {
      id: "behavioral_anomaly",
      name: "Behavioral Anomaly",
      status: "WARN",
      severity: "MEDIUM",
      expected: "Known recipient for this agent",
      actual: labelAddress(intent.recipient),
      explanation: "This agent has not sent to this recipient in recorded history.",
    };
  }

  if (!seenActions.has(intent.action)) {
    return {
      id: "behavioral_anomaly",
      name: "Behavioral Anomaly",
      status: "WARN",
      severity: "LOW",
      expected: `Known action (${[...seenActions].join(", ")})`,
      actual: intent.action,
      explanation: "This action type is new for the agent.",
    };
  }

  return {
    id: "behavioral_anomaly",
    name: "Behavioral Anomaly",
    status: "PASS",
    severity: "MEDIUM",
    expected: "Within historical envelope",
    actual: formatAmount(intent.amount, intent.token),
    explanation: "Intent matches this agent's recent pattern.",
  };
}

/** Seeded baseline so the demo has a real envelope without fake live data. */
export function demoBaseline(agent: string): BehaviorEvent[] {
  return [180, 220, 200, 250, 210].map((amount) => ({
    agent,
    action: "transfer" as const,
    amount,
    token: "USDT",
    recipient: "0x1111111111111111111111111111111111111111",
  }));
}
