import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decodeObservedTx, isAttestationCall } from "@/lib/firewall/decode";
import { preflightGate } from "@/lib/firewall/gate";
import { toFunctionSelector } from "viem";

describe("firewall decode and gate", () => {
  it("classifies native transfers", () => {
    const intent = decodeObservedTx(
      {
        hash: "0x01",
        from: "0xce9D8a28b6C18158851eb1167294f5eA90CE17Ac",
        to: "0x1111111111111111111111111111111111111111",
        input: "0x",
        value: 10n ** 18n,
        blockNumber: 1n,
      },
      "Treasury Agent",
      1952,
    );
    assert.equal(intent.action, "transfer");
    assert.equal(intent.token, "OKB");
    assert.equal(intent.amount, 1);
  });

  it("recognizes attestation writes", () => {
    const sel = toFunctionSelector("attest(bytes32,uint8,uint8,bytes32)");
    assert.equal(isAttestationCall(sel), true);
    const gate = preflightGate({ isAttestationWrite: true, hadAllow: false });
    assert.equal(gate.status, "PASS");
  });

  it("BLOCKs a spend with no ALLOW", () => {
    const gate = preflightGate({ isAttestationWrite: false, hadAllow: false });
    assert.equal(gate.status, "FAIL");
    assert.equal(gate.severity, "CRITICAL");
  });
});
