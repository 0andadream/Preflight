import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generatePrivateKey } from "viem/accounts";
import { parsePaymentHeader, payToAddress, signPayment, verifyPayment } from "@/lib/x402/protocol";

describe("x402 payment proof", () => {
  it("signs and verifies an EIP-712 payment", async () => {
    const key = generatePrivateKey();
    const payTo = payToAddress();
    const proof = await signPayment(key, payTo);
    const ok = await verifyPayment(proof, payTo);
    assert.equal(ok.ok, true);
    const header = Buffer.from(JSON.stringify(proof)).toString("base64");
    assert.ok(parsePaymentHeader(header));
  });

  it("rejects the wrong payTo", async () => {
    const key = generatePrivateKey();
    const proof = await signPayment(key, "0x1111111111111111111111111111111111111111");
    const ok = await verifyPayment(proof, "0x2222222222222222222222222222222222222222");
    assert.equal(ok.ok, false);
  });
});
