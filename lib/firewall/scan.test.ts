import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateObserved, nameAgent } from "@/lib/firewall/scan";
import type { RegisteredAgent } from "@/lib/firewall/registry";
import { TREASURY_AGENT } from "@/lib/policy/defaults";

const TREASURY: RegisteredAgent = {
  address: "0xce9D8a28b6C18158851eb1167294f5eA90CE17Ac",
  agent: TREASURY_AGENT,
  chainId: 1952,
};

describe("network-wide scanner", () => {
  it("labels unknown senders by address, not the treasury name", () => {
    const labeled = nameAgent("0x9999999999999999999999999999999999999999", [TREASURY]);
    assert.equal(labeled.registered, false);
    assert.match(labeled.agent, /^Agent 0x9999/);
    assert.notEqual(labeled.agent, TREASURY_AGENT);
  });

  it("keeps roster names only as labels", () => {
    const labeled = nameAgent(TREASURY.address, [TREASURY]);
    assert.equal(labeled.registered, true);
    assert.equal(labeled.agent, TREASURY_AGENT);
  });

  it("evaluates every sender; unregistered spends only hit the gate", () => {
    const hit = evaluateObserved({
      tx: {
        hash: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        from: "0x8888888888888888888888888888888888888888",
        to: "0x1111111111111111111111111111111111111111",
        input: "0x",
        value: 10n ** 17n,
        blockNumber: 42n,
      },
      chain: { id: 196, name: "X Layer" },
      named: [TREASURY],
      allowByFrom: new Set(),
    });
    assert.equal(hit.agent, "Agent 0x8888…8888");
    assert.equal(hit.registered, false);
    assert.equal(hit.chainId, 196);
    assert.equal(hit.kind, "spend");
    assert.equal(hit.decision, "BLOCK");
    assert.deepEqual(
      hit.checks.map((c) => c.id),
      ["preflight_gate"],
    );
  });

  it("runs the named policy only for registered agents", () => {
    const hit = evaluateObserved({
      tx: {
        hash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        from: TREASURY.address,
        to: "0x1111111111111111111111111111111111111111",
        input: "0x",
        value: 10n ** 17n,
        blockNumber: 9n,
      },
      chain: { id: 1952, name: "X Layer Testnet" },
      named: [TREASURY],
      allowByFrom: new Set([TREASURY.address.toLowerCase()]),
    });
    assert.equal(hit.agent, TREASURY_AGENT);
    assert.equal(hit.registered, true);
    assert.ok(hit.checks.some((c) => c.id === "spend_limit"));
    assert.ok(hit.checks.some((c) => c.id === "preflight_gate"));
  });
});
