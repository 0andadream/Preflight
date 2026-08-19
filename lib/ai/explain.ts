import OpenAI from "openai";
import { formatAmount, labelAddress } from "@/lib/policy/defaults";
import type { Decision, Explanation, RuleResult, TransactionIntent } from "@/types";

export function deterministicExplanation(input: {
  decision: Decision;
  score: number;
  checks: RuleResult[];
  intent: TransactionIntent;
}): Explanation {
  const fails = input.checks.filter((c) => c.status === "FAIL");
  const spend = fails.find((c) => c.id === "spend_limit");
  const recipient = fails.find((c) => c.id === "recipient_allowlist");
  const contract = fails.find((c) => c.id === "contract_allowlist");
  const approval = fails.find((c) => c.id === "unlimited_approval");
  const token = fails.find((c) => c.id === "token_allowlist");
  const dvn = fails.find((c) => c.id === "dvn_threshold");

  if (input.decision === "ALLOW") {
    return {
      summary: `I allowed this ${input.intent.action} of ${formatAmount(input.intent.amount, input.intent.token)} on X Layer. It stays inside the agent's policy.`,
      mainRisk: "None material.",
      remediation: "Proceed with execution. Re-run Preflight if the intent changes.",
      source: "deterministic",
    };
  }

  const parts: string[] = [];
  if (spend) {
    parts.push(
      `I refused this transaction because it requests ${formatAmount(input.intent.amount, input.intent.token)}, which exceeds the agent's configured ${spend.expected} transaction limit.`,
    );
  }
  if (recipient) {
    parts.push("The recipient is not approved.");
  }
  if (contract) {
    parts.push(`The destination contract (${labelAddress(input.intent.contract || input.intent.recipient)}) is not on the approved contract list.`);
  }
  if (approval) {
    parts.push("Unlimited token approval to an unapproved contract creates significant asset-loss risk.");
  }
  if (token) {
    parts.push(`${input.intent.token} is not on the token allowlist.`);
  }
  if (dvn) {
    parts.push(
      `The DVN threshold dropped (${dvn.actual}; required ${dvn.expected}). This route is no longer safe to execute.`,
    );
  }
  if (parts.length === 0 && fails[0]) {
    parts.push(fails[0].explanation);
  }

  const remediation = approval
    ? "Do not execute. Grant a finite allowance to a trusted contract, or add this spender to the policy first."
    : dvn
      ? "Do not execute. Restore the required DVN set before retrying this route."
      : "Reduce the transaction amount or explicitly approve this recipient/contract before retrying.";

  return {
    summary: parts.join(" "),
    mainRisk: fails[0] ? `${fails[0].name}: ${fails[0].actual}` : "Policy violation",
    remediation,
    source: "deterministic",
  };
}

export async function explainWithModel(input: {
  decision: Decision;
  score: number;
  checks: RuleResult[];
  intent: TransactionIntent;
}): Promise<Explanation> {
  const fallback = deterministicExplanation(input);
  const key = process.env.XAI_API_KEY;
  if (!key) return fallback;

  try {
    const client = new OpenAI({ apiKey: key, baseURL: "https://api.x.ai/v1" });
    const completion = await client.chat.completions.create({
      model: "grok-4.6",
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You explain already-determined Preflight decisions for AI-agent transactions on X Layer. You MUST NOT change the decision, score, or any rule status. Return compact JSON only: {summary, mainRisk, remediation}. Two or three sentences max. No markdown.",
        },
        {
          role: "user",
          content: JSON.stringify({
            decision: input.decision,
            score: input.score,
            intent: input.intent,
            failedRules: input.checks.filter((c) => c.status === "FAIL"),
            warnings: input.checks.filter((c) => c.status === "WARN"),
          }),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    const parsed = JSON.parse(match[0]) as { summary?: string; mainRisk?: string; remediation?: string };
    if (!parsed.summary || !parsed.remediation) return fallback;
    return {
      summary: parsed.summary,
      mainRisk: parsed.mainRisk || fallback.mainRisk,
      remediation: parsed.remediation,
      source: "grok-4.6",
    };
  } catch {
    return fallback;
  }
}
