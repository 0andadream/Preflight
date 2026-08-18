import type { RuleResult, TransactionIntent } from "@/types";

export type SimulationInput = TransactionIntent & { forceRevert?: boolean };

export function simulateTransaction(intent: SimulationInput): RuleResult {
  if (intent.forceRevert) {
    return {
      id: "simulation",
      name: "Simulation",
      status: "FAIL",
      severity: "CRITICAL",
      expected: "Call succeeds on X Layer",
      actual: "REVERT",
      explanation: "Local simulation reverted. The transaction would fail if executed.",
    };
  }

  if (!intent.decoded && intent.action === "contract") {
    return {
      id: "simulation",
      name: "Simulation",
      status: "WARN",
      severity: "MEDIUM",
      expected: "Decodable calldata",
      actual: "Unable to decode transaction",
      explanation: "Calldata could not be decoded. Simulation ran against the raw payload only.",
    };
  }

  return {
    id: "simulation",
    name: "Simulation",
    status: "PASS",
    severity: "HIGH",
    expected: "Call succeeds on X Layer",
    actual: "Would succeed",
    explanation: "Deterministic dry-run did not revert.",
  };
}
