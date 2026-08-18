import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyDriftSimulation, demoSafeConfig } from "@/lib/demo/snapshot";
import { evaluatePolicy, policyForAgent } from "@/lib/policy/evaluate";
import { evaluateSecurityRules } from "@/lib/rules/engine";
import { computeScore, decide } from "@/lib/scoring/score";
import { buildRecord, hashRecord } from "@/lib/attestation/pdr";
import { deterministicExplanation } from "@/lib/ai/explain";
import type { TransactionIntent } from "@/types";

const safeIntent: TransactionIntent = {
  agent: "Demo Treasury Agent",
  token: "USDT0",
  amount: 500,
  sourceChain: "X Layer",
  destinationChain: "Arbitrum",
};

const blockIntent: TransactionIntent = { ...safeIntent, amount: 5000 };

function run(intent: TransactionIntent, drift: boolean) {
  const observed = drift
    ? applyDriftSimulation(demoSafeConfig(intent, 30110))
    : demoSafeConfig(intent, 30110);
  const checks = [
    ...evaluateSecurityRules(observed, undefined, intent),
    ...evaluatePolicy(policyForAgent(intent.agent), intent),
  ];
  return { observed, checks, decision: decide(checks), score: computeScore(checks).total };
}

describe("deterministic preflight engine", () => {
  it("ALLOWs a $500 USDT0 transfer with a 2/2 stack", () => {
    const { decision, score, checks } = run(safeIntent, false);
    assert.equal(decision, "ALLOW");
    assert.ok(score >= 90, `score ${score}`);
    assert.ok(checks.every((c) => c.status !== "FAIL"));
    const dvn = checks.find((c) => c.id === "dvn_threshold");
    assert.equal(dvn?.status, "PASS");
    assert.match(dvn?.actual ?? "", /2/);
  });

  it("BLOCKs configuration drift 2/2 → 1/2 plus a policy breach", () => {
    const { decision, score, checks, observed } = run(blockIntent, true);
    assert.equal(observed.source, "simulation");
    assert.equal(observed.requiredDvnCount, 1);
    assert.equal(decision, "BLOCK");
    assert.ok(score < 50, `score ${score}`);
    const dvn = checks.find((c) => c.id === "dvn_threshold");
    const policy = checks.find((c) => c.id === "agent_policy_amount");
    assert.equal(dvn?.status, "FAIL");
    assert.equal(policy?.status, "FAIL");
  });

  it("reproduces the same decision from the same inputs", () => {
    const a = run(blockIntent, true);
    const b = run(blockIntent, true);
    assert.equal(a.decision, b.decision);
    assert.equal(a.score, b.score);
    assert.deepEqual(
      a.checks.map((c) => [c.id, c.status]),
      b.checks.map((c) => [c.id, c.status]),
    );
  });

  it("hashes a Policy Decision Record deterministically", () => {
    const { checks, decision, score } = run(safeIntent, false);
    const rec = {
      timestamp: "2026-08-18T00:00:00.000Z",
      intent: safeIntent,
      sourceChainId: 196,
      checks,
      policy: policyForAgent(safeIntent.agent),
      score,
      decision,
    };
    const hashA = hashRecord(buildRecord(rec));
    const hashB = hashRecord(buildRecord(rec));
    assert.equal(hashA, hashB);
    assert.match(hashA, /^0x[0-9a-f]{64}$/);
  });

  it("never lets the explanation rewrite the decision", () => {
    const { checks, decision, score, observed } = run(blockIntent, true);
    const explained = deterministicExplanation({
      decision,
      score,
      checks,
      intent: blockIntent,
      observed,
    });
    assert.equal(decision, "BLOCK");
    assert.match(explained.summary.toLowerCase(), /dvn|refused|exceed/);
    assert.match(explained.remediation.toLowerCase(), /do not execute|restore/);
  });

  it("fails an unlisted destination", () => {
    const intent = { ...safeIntent, destinationChain: "ethereum" };
    const { checks, decision } = run(intent, false);
    const dest = checks.find((c) => c.id === "agent_policy_destination");
    assert.equal(dest?.status, "FAIL");
    assert.equal(decision, "BLOCK");
  });
});
