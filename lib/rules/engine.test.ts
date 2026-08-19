import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deterministicExplanation } from "@/lib/ai/explain";
import { buildRecord, hashRecord } from "@/lib/attestation/pdr";
import { intentFromRequest } from "@/lib/demo/scenarios";
import { TREASURY_VAULT, UNKNOWN_ADDRESS, policyForAgent } from "@/lib/policy/defaults";
import { demoBaseline } from "@/lib/behavior/anomaly";
import { evaluateTransaction } from "@/lib/rules/engine";
import { computeScore, decide } from "@/lib/scoring/score";

function run(req: Parameters<typeof intentFromRequest>[0]) {
  const intent = intentFromRequest(req);
  const policy = policyForAgent(intent.agent);
  const checks = evaluateTransaction(intent, policy);
  return { intent, policy, checks, decision: decide(checks), score: computeScore(checks).total };
}

describe("transaction security engine", () => {
  it("ALLOWs a $500 USDT transfer to an approved recipient", () => {
    const { decision, score, checks } = run({ scenario: "safe", amount: 500, token: "USDT" });
    assert.equal(decision, "ALLOW");
    assert.ok(score >= 90, `score ${score}`);
    assert.ok(checks.every((c) => c.status !== "FAIL"));
  });

  it("BLOCKs a $5,000 transfer when the limit is $1,000", () => {
    const { decision, checks } = run({ scenario: "over-limit" });
    assert.equal(decision, "BLOCK");
    assert.equal(checks.find((c) => c.id === "spend_limit")?.status, "FAIL");
    assert.equal(checks.find((c) => c.id === "recipient_allowlist")?.status, "FAIL");
  });

  it("BLOCKs unlimited approval to an unknown contract", () => {
    const { decision, checks } = run({ scenario: "unlimited-approval" });
    assert.equal(decision, "BLOCK");
    const approval = checks.find((c) => c.id === "unlimited_approval");
    assert.equal(approval?.status, "FAIL");
    assert.equal(approval?.severity, "CRITICAL");
  });

  it("ALLOWs an approved token to an approved recipient at an acceptable amount", () => {
    const { decision } = run({
      action: "transfer",
      token: "USDC",
      amount: 250,
      recipient: TREASURY_VAULT,
    });
    assert.equal(decision, "ALLOW");
  });

  it("BLOCKs an otherwise valid transfer to an unknown recipient", () => {
    const { decision, checks } = run({
      action: "transfer",
      token: "USDT",
      amount: 200,
      recipient: UNKNOWN_ADDRESS,
    });
    assert.equal(decision, "BLOCK");
    assert.equal(checks.find((c) => c.id === "recipient_allowlist")?.status, "FAIL");
    assert.equal(checks.find((c) => c.id === "spend_limit")?.status, "PASS");
  });

  it("reproduces the same decision from the same inputs", () => {
    const a = run({ scenario: "over-limit" });
    const b = run({ scenario: "over-limit" });
    assert.equal(a.decision, b.decision);
    assert.equal(a.score, b.score);
    assert.deepEqual(
      a.checks.map((c) => [c.id, c.status]),
      b.checks.map((c) => [c.id, c.status]),
    );
  });

  it("hashes a Policy Decision Record deterministically", () => {
    const { intent, policy, checks, decision, score } = run({ amount: 500 });
    const rec = { timestamp: "2026-08-18T00:00:00.000Z", intent, checks, policy, score, decision };
    const hashA = hashRecord(buildRecord(rec));
    const hashB = hashRecord(buildRecord(rec));
    assert.equal(hashA, hashB);
    assert.match(hashA, /^0x[0-9a-f]{64}$/);
  });

  it("WARNs a historically large but policy-legal transfer", () => {
    const { intent, policy } = run({ scenario: "anomaly" });
    const checks = evaluateTransaction(intent, policy, demoBaseline(intent.agent));
    assert.equal(decide(checks), "WARN");
    assert.equal(checks.find((c) => c.id === "behavioral_anomaly")?.status, "WARN");
    assert.equal(checks.find((c) => c.id === "spend_limit")?.status, "PASS");
  });

  it("BLOCKs when the DVN threshold drops", () => {
    const { decision, checks } = run({ scenario: "dvn-drop" });
    assert.equal(decision, "BLOCK");
    const dvn = checks.find((c) => c.id === "dvn_threshold");
    assert.equal(dvn?.status, "FAIL");
    assert.match(dvn?.actual || "", /1 of 2/);
    assert.equal(checks.find((c) => c.id === "spend_limit")?.status, "PASS");
  });

  it("BLOCKs the compromised route on spend limit, recipient, and DVN", () => {
    const { decision, checks } = run({ scenario: "compromised" });
    assert.equal(decision, "BLOCK");
    assert.equal(checks.find((c) => c.id === "spend_limit")?.status, "FAIL");
    assert.equal(checks.find((c) => c.id === "recipient_allowlist")?.status, "FAIL");
    assert.equal(checks.find((c) => c.id === "dvn_threshold")?.status, "FAIL");
  });

  it("never lets the explanation rewrite the decision", () => {
    const { checks, decision, score, intent } = run({ scenario: "unlimited-approval" });
    const explained = deterministicExplanation({ decision, score, checks, intent });
    assert.equal(decision, "BLOCK");
    assert.match(explained.summary.toLowerCase(), /unlimited|approval|refused|exceed/);
  });
});
