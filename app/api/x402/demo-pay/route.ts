import { NextResponse } from "next/server";
import { payToAddress, signPayment } from "@/lib/x402/protocol";
import type { Hex } from "viem";

export const runtime = "nodejs";

/** Demo helper: signs an x402 proof with the attester key. Not a wallet. */
export async function POST() {
  const key = process.env.ATTESTER_PRIVATE_KEY as Hex | undefined;
  if (!key) {
    return NextResponse.json({ error: "ATTESTER_PRIVATE_KEY required to demo-sign" }, { status: 400 });
  }
  const proof = await signPayment(key, payToAddress());
  return NextResponse.json({
    proof,
    header: Buffer.from(JSON.stringify(proof)).toString("base64"),
    note: "Attach this as PAYMENT-SIGNATURE on POST /api/preflight/paid",
  });
}
