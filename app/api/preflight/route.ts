import { NextResponse } from "next/server";
import { runPreflight } from "@/lib/preflight/run";
import { appendHistory } from "@/lib/store/history";
import type { TxAction } from "@/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    agent?: string;
    action?: TxAction;
    token?: string;
    amount?: number;
    recipient?: string;
    contract?: string;
    functionName?: string | null;
    value?: number;
    slippageBps?: number;
    transactionData?: string;
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
    functionName: body.functionName,
    value: body.value,
    slippageBps: body.slippageBps,
    transactionData: body.transactionData,
    scenario: body.scenario,
    attest: body.attest,
  });

  await appendHistory(result);

  return NextResponse.json(result);
}
