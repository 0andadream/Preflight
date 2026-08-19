import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SEED_CATALOG, buildSeedFirewallHits, buildSeedHistory, evaluateSeed } from "@/lib/demo/catalog";

describe("demo seed catalog", () => {
  it("has 8–12 realistic preflights with ALLOW, WARN, and BLOCK", () => {
    assert.ok(SEED_CATALOG.length >= 8 && SEED_CATALOG.length <= 12);
    const decisions = SEED_CATALOG.map((spec) => evaluateSeed(spec).decision);
    assert.ok(decisions.includes("ALLOW"));
    assert.ok(decisions.includes("WARN"));
    assert.ok(decisions.includes("BLOCK"));
  });

  it("includes a clear DVN-threshold BLOCK and an over-limit BLOCK", () => {
    const dvn = evaluateSeed(SEED_CATALOG.find((s) => s.id === "block-dvn")!);
    const over = evaluateSeed(SEED_CATALOG.find((s) => s.id === "block-over-limit")!);
    assert.equal(dvn.decision, "BLOCK");
    assert.equal(dvn.checks.find((c) => c.id === "dvn_threshold")?.status, "FAIL");
    assert.equal(over.decision, "BLOCK");
    assert.equal(over.checks.find((c) => c.id === "spend_limit")?.status, "FAIL");
  });

  it("labels every seeded row as demo", () => {
    assert.ok(buildSeedHistory().every((row) => row.demo === true));
    assert.ok(buildSeedFirewallHits().every((row) => row.demo === true));
  });
});
