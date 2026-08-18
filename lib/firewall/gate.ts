import type { RuleResult } from "@/types";

export function preflightGate(input: { isAttestationWrite: boolean; hadAllow: boolean }): RuleResult {
  if (input.isAttestationWrite) {
    return {
      id: "preflight_gate",
      name: "Firewall Gate",
      status: "PASS",
      severity: "CRITICAL",
      expected: "Preflight ALLOW before spend",
      actual: "Attestation write",
      explanation: "This transaction is the Preflight receipt itself, not a spend.",
    };
  }

  if (input.hadAllow) {
    return {
      id: "preflight_gate",
      name: "Firewall Gate",
      status: "PASS",
      severity: "CRITICAL",
      expected: "Preflight ALLOW before execution",
      actual: "ALLOW receipt on X Layer",
      explanation: "An ALLOW attestation exists for this agent in the watch window.",
    };
  }

  return {
    id: "preflight_gate",
    name: "Firewall Gate",
    status: "FAIL",
    severity: "CRITICAL",
    expected: "Preflight ALLOW before execution",
    actual: "Executed on X Layer with no ALLOW",
    explanation:
      "This agent transaction landed on X Layer without a Preflight ALLOW. The firewall cannot revert a mined tx; it records a BLOCK and the agent should be halted.",
  };
}
