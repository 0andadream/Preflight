import { NextResponse } from "next/server";
import { runPreflight } from "@/lib/preflight/run";
import { appendHistory } from "@/lib/store/history";
import { consumeNonce } from "@/lib/x402/nonces";
import { parsePaymentHeader, payToAddress, paymentRequirements, verifyPayment } from "@/lib/x402/protocol";
import type { TxAction } from "@/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const payTo = payToAddress();
  const proof = parsePaymentHeader(req.headers.get("payment-signature") || req.headers.get("x-payment"));

  if (!proof) {
    return NextResponse.json(
      {
        error: "Payment required",
        ...paymentRequirements(payTo),
      },
      { status: 402 },
    );
  }

  const verified = await verifyPayment(proof, payTo);
  if (!verified.ok) {
    return NextResponse.json({ error: `Invalid payment: ${verified.reason}`, ...paymentRequirements(payTo) }, { status: 402 });
  }
  if (!(await consumeNonce(proof.nonce))) {
    return NextResponse.json({ error: "Payment nonce already used", ...paymentRequirements(payTo) }, { status: 402 });
  }

  const body = (await req.json()) as {
    agent?: string;
    action?: TxAction;
    token?: string;
    amount?: number;
    recipient?: string;
    contract?: string;
    scenario?: "safe" | "over-limit" | "unlimited-approval" | "anomaly";
    attest?: boolean;
  };

  const result = await runPreflight({
    agent: body.agent || "Treasury Agent",
    action: body.action,
    token: body.token || "USDT",
    amount: body.amount,
    recipient: body.recipient,
    contract: body.contract,
    scenario: body.scenario,
    attest: body.attest,
  });

  await appendHistory(result);

  return NextResponse.json({
    ...result,
    payment: {
      settled: false,
      verified: true,
      from: verified.from,
      scheme: "exact",
      network: "eip155:196",
      note: "x402 payment proof verified. Onchain USDT0 settlement requires a facilitator; the check is still gated.",
    },
  });
}
