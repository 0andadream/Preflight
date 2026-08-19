import {
  formatAmount,
  isUnlimited,
  labelAddress,
  normalizeToken,
} from "@/lib/policy/defaults";
import { evaluateBehavior, type BehaviorEvent } from "@/lib/behavior/anomaly";
import { simulateTransaction } from "@/lib/simulation/simulate";
import type { AgentPolicy, RuleResult, TransactionIntent } from "@/types";

const MAX_UINT = "MAX_UINT256";

function sameAddr(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function inList(value: string, list: string[]): boolean {
  const v = value.trim().toLowerCase();
  return list.some((item) => item.trim().toLowerCase() === v);
}

export function evaluateTransaction(
  intent: TransactionIntent,
  policy: AgentPolicy,
  history: BehaviorEvent[] = [],
): RuleResult[] {
  return [
    spendLimit(intent, policy),
    tokenAllowlist(intent, policy),
    contractAllowlist(intent, policy),
    recipientAllowlist(intent, policy),
    unlimitedApproval(intent, policy),
    slippageLimit(intent, policy),
    dvnThreshold(intent),
    simulateTransaction(intent),
    gasAnomaly(intent),
    evaluateBehavior(intent, history),
  ];
}

export function spendLimit(intent: TransactionIntent, policy: AgentPolicy): RuleResult {
  if (intent.action === "approve" && isUnlimited(intent.amount)) {
    return {
      id: "spend_limit",
      name: "Spend Limit",
      status: "FAIL",
      severity: "CRITICAL",
      expected: `≤ $${policy.maxTransactionAmount.toLocaleString()}`,
      actual: MAX_UINT,
      explanation: "Unlimited approval has no spending ceiling.",
    };
  }

  const over = intent.amount > policy.maxTransactionAmount;
  return {
    id: "spend_limit",
    name: "Spend Limit",
    status: over ? "FAIL" : "PASS",
    severity: "CRITICAL",
    expected: `≤ $${policy.maxTransactionAmount.toLocaleString()}`,
    actual: formatAmount(intent.amount, intent.token),
    explanation: over
      ? "Transaction exceeds the agent's configured spending limit."
      : "Requested amount is within the agent's spending limit.",
  };
}

export function tokenAllowlist(intent: TransactionIntent, policy: AgentPolicy): RuleResult {
  const token = normalizeToken(intent.token);
  const ok = policy.allowedTokens.some((t) => normalizeToken(t) === token);
  return {
    id: "token_allowlist",
    name: "Token Allowlist",
    status: ok ? "PASS" : "FAIL",
    severity: "HIGH",
    expected: policy.allowedTokens.join(", "),
    actual: token || "—",
    explanation: ok
      ? `${token} is on the agent's token allowlist.`
      : `${token} is not an approved token for this agent.`,
  };
}

export function contractAllowlist(intent: TransactionIntent, policy: AgentPolicy): RuleResult {
  if (intent.action === "transfer") {
    return {
      id: "contract_allowlist",
      name: "Contract Allowlist",
      status: "PASS",
      severity: "HIGH",
      expected: "No protocol call",
      actual: "Native transfer",
      explanation: "This is a token transfer, not a protocol interaction.",
    };
  }

  const target = intent.action === "approve" ? intent.recipient : intent.contract;
  const ok = Boolean(target) && inList(target, policy.allowedContracts);
  return {
    id: "contract_allowlist",
    name: "Contract Allowlist",
    status: ok ? "PASS" : "FAIL",
    severity: "HIGH",
    expected: policy.allowedContracts.map(labelAddress).join(", ") || "approved contracts",
    actual: labelAddress(target),
    explanation: ok
      ? `${labelAddress(target)} is an approved contract.`
      : "The destination contract is not on the approved contract list.",
  };
}

export function recipientAllowlist(intent: TransactionIntent, policy: AgentPolicy): RuleResult {
  if (intent.action !== "transfer") {
    return {
      id: "recipient_allowlist",
      name: "Recipient Allowlist",
      status: "PASS",
      severity: "HIGH",
      expected: "Recipient check applies to transfers",
      actual: intent.action,
      explanation: "Recipient allowlist is not the binding control for this action.",
    };
  }

  const ok = Boolean(intent.recipient) && inList(intent.recipient, policy.allowedRecipients);
  return {
    id: "recipient_allowlist",
    name: "Recipient Allowlist",
    status: ok ? "PASS" : "FAIL",
    severity: "HIGH",
    expected: policy.allowedRecipients.map(labelAddress).join(", "),
    actual: labelAddress(intent.recipient),
    explanation: ok
      ? `${labelAddress(intent.recipient)} is an approved recipient.`
      : "The recipient is not approved for this agent.",
  };
}

export function unlimitedApproval(intent: TransactionIntent, policy: AgentPolicy): RuleResult {
  if (intent.action !== "approve") {
    return {
      id: "unlimited_approval",
      name: "Approval Risk",
      status: "PASS",
      severity: "CRITICAL",
      expected: "No unlimited approval",
      actual: "Not an approval",
      explanation: "This intent does not grant a token allowance.",
    };
  }

  const spenderTrusted = inList(intent.recipient, policy.allowedContracts);
  if (isUnlimited(intent.amount) && !spenderTrusted) {
    return {
      id: "unlimited_approval",
      name: "Approval Risk",
      status: "FAIL",
      severity: "CRITICAL",
      expected: "Finite allowance to a trusted spender",
      actual: `approve(${labelAddress(intent.recipient)}, ${MAX_UINT})`,
      explanation:
        "Unlimited token approval to an unapproved contract creates significant asset-loss risk.",
    };
  }

  if (isUnlimited(intent.amount) && spenderTrusted) {
    return {
      id: "unlimited_approval",
      name: "Approval Risk",
      status: "WARN",
      severity: "MEDIUM",
      expected: "Finite allowance",
      actual: `approve(${labelAddress(intent.recipient)}, ${MAX_UINT})`,
      explanation: "Spender is trusted, but unlimited allowance is still broader than necessary.",
    };
  }

  return {
    id: "unlimited_approval",
    name: "Approval Risk",
    status: "PASS",
    severity: "CRITICAL",
    expected: "Finite allowance",
    actual: `approve(${labelAddress(intent.recipient)}, ${formatAmount(intent.amount, intent.token)})`,
    explanation: "Allowance is finite.",
  };
}

export function slippageLimit(intent: TransactionIntent, policy: AgentPolicy): RuleResult {
  if (intent.action !== "swap") {
    return {
      id: "slippage_limit",
      name: "Slippage Limit",
      status: "PASS",
      severity: "MEDIUM",
      expected: `≤ ${policy.maxSlippageBps} bps`,
      actual: "n/a",
      explanation: "Slippage applies to swaps only.",
    };
  }

  const over = intent.slippageBps > policy.maxSlippageBps;
  return {
    id: "slippage_limit",
    name: "Slippage Limit",
    status: over ? "FAIL" : "PASS",
    severity: "HIGH",
    expected: `≤ ${policy.maxSlippageBps} bps`,
    actual: `${intent.slippageBps} bps`,
    explanation: over
      ? "Requested slippage exceeds the agent's configured maximum."
      : "Slippage is within the agent's limit.",
  };
}

export function dvnThreshold(intent: TransactionIntent): RuleResult {
  if (intent.dvnRequired == null && intent.dvnObserved == null) {
    return {
      id: "dvn_threshold",
      name: "DVN Threshold",
      status: "PASS",
      severity: "CRITICAL",
      expected: "Applies to OFT / message routes",
      actual: "Not a verified-message route",
      explanation: "This intent does not use a DVN-verified message path.",
    };
  }

  const need = intent.dvnRequired ?? 2;
  const got = intent.dvnObserved ?? 0;
  const ok = got >= need;
  return {
    id: "dvn_threshold",
    name: "DVN Threshold",
    status: ok ? "PASS" : "FAIL",
    severity: "CRITICAL",
    expected: `${need} of ${need} DVNs`,
    actual: `${got} of ${need} DVNs`,
    explanation: ok
      ? "Required DVN threshold is intact."
      : "DVN threshold dropped. The message path no longer meets the agent's security requirement.",
  };
}

export function gasAnomaly(intent: TransactionIntent): RuleResult {
  const elevated = intent.value > 0 && intent.action !== "transfer" && intent.action !== "swap";
  if (elevated) {
    return {
      id: "gas_anomaly",
      name: "Value / Gas",
      status: "WARN",
      severity: "MEDIUM",
      expected: "No unexpected native value",
      actual: `${intent.value} OKB`,
      explanation: "This call attaches native value in addition to the token action.",
    };
  }

  return {
    id: "gas_anomaly",
    name: "Value / Gas",
    status: "PASS",
    severity: "LOW",
    expected: "Ordinary native value",
    actual: intent.value ? `${intent.value} OKB` : "0 OKB",
    explanation: "No native-value anomaly detected.",
  };
}

export function decodeUnavailable(intent: TransactionIntent): boolean {
  return intent.action === "contract" && !intent.decoded && !intent.functionName;
}

export { sameAddr };
