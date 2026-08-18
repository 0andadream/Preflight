import { NextResponse } from "next/server";
import { runPreflight } from "@/lib/preflight/run";
import { appendHistory } from "@/lib/store/history";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    agent?: string;
    token?: string;
    amount?: number;
    sourceChain?: string;
    destinationChain?: string;
    simulateDrift?: boolean;
    attest?: boolean;
  };

  if (body.amount == null || Number.isNaN(Number(body.amount))) {
    return NextResponse.json({ error: "amount is required" }, { status: 400 });
  }

  const result = await runPreflight({
    agent: body.agent || "Demo Treasury Agent",
    token: body.token || "USDT0",
    amount: Number(body.amount),
    sourceChain: body.sourceChain || "X Layer",
    destinationChain: body.destinationChain || "arbitrum",
    simulateDrift: Boolean(body.simulateDrift),
    attest: body.attest,
  });

  await appendHistory(result);

  return NextResponse.json({
    decision: result.decision,
    score: result.score,
    riskLabel: result.riskLabel,
    policyHash: result.policyHash,
    checks: result.checks,
    explanation: result.explanation,
    mainRisk: result.mainRisk,
    remediation: result.remediation,
    explanationSource: result.explanationSource,
    intent: result.intent,
    policy: result.policy,
    observed: result.observed,
    scoreBreakdown: result.scoreBreakdown,
    record: result.record,
    attestation: result.attestation,
  });
}
