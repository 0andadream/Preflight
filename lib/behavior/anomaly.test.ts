import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { demoBaseline, evaluateBehavior } from "@/lib/behavior/anomaly";
import { intentFromRequest } from "@/lib/demo/scenarios";

describe("behavioral anomaly", () => {
  it("PASSes when history is too thin", () => {
    const intent = intentFromRequest({ amount: 900 });
    const result = evaluateBehavior(intent, []);
    assert.equal(result.status, "PASS");
  });

  it("WARNs when amount is far above the agent's median", () => {
    const intent = intentFromRequest({ scenario: "anomaly" });
    const result = evaluateBehavior(intent, demoBaseline(intent.agent));
    assert.equal(result.status, "WARN");
    assert.equal(result.severity, "HIGH");
  });

  it("does not fail — behavior never BLOCKs on its own", () => {
    const intent = intentFromRequest({ scenario: "anomaly" });
    const result = evaluateBehavior(intent, demoBaseline(intent.agent));
    assert.notEqual(result.status, "FAIL");
  });
});
