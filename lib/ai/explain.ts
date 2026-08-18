import OpenAI from "openai";
import type { Decision, Explanation, ObservedConfig, RuleResult, TransactionIntent } from "@/types";

export function deterministicExplanation(input: {
  decision: Decision;
  score: number;
  checks: RuleResult[];
  intent: TransactionIntent;
  observed: ObservedConfig;
}): Explanation {
  const fails = input.checks.filter((c) => c.status === "FAIL");
  const warns = input.checks.filter((c) => c.status === "WARN");
  const primary = fails[0] ?? warns[0];

  if (input.decision === "ALLOW") {
    return {
      summary: `The ${input.intent.amount.toLocaleString()} ${input.intent.token} transfer from ${input.intent.sourceChain} to ${input.intent.destinationChain} satisfies the agent's security assumptions and spending policy.`,
      mainRisk: "None material. Pathway configuration matches the expected LayerZero security stack.",
      remediation: "Proceed with execution. Re-run Preflight immediately before sending if configuration can change.",
      source: "deterministic",
    };
  }

  const parts: string[] = [];
  const dvn = fails.find((c) => c.id === "dvn_threshold");
  const amount = fails.find((c) => c.id === "agent_policy_amount");
  const dest = fails.find((c) => c.id === "agent_policy_destination");

  if (dvn) {
    parts.push(
      `The transaction was refused because the LayerZero DVN threshold for the selected route changed from ${dvn.expected} to ${dvn.actual}.`,
    );
  }
  if (amount) {
    parts.push(
      `The requested $${input.intent.amount.toLocaleString()} transfer exceeds the agent's configured ${amount.expected.replace("≤ ", "")} transaction limit.`,
    );
  }
  if (dest) {
    parts.push(`Destination ${input.intent.destinationChain} is not in the agent's allowlist.`);
  }
  if (!dvn && !amount && !dest && primary) {
    parts.push(`${primary.name} ${primary.status}: ${primary.explanation}`);
  }

  const summary =
    parts.join(" ") ||
    `Preflight returned ${input.decision} with score ${input.score}. One or more security assumptions no longer hold.`;

  const remediation = fails.some((c) => c.id.startsWith("dvn") || c.id.startsWith("agent_policy"))
    ? "Do not execute until the DVN configuration is restored and the agent policy is updated."
    : `Restore the expected ${primary?.name ?? "configuration"} or explicitly update the security policy before retrying.`;

  return {
    summary,
    mainRisk: primary ? `${primary.name}: ${primary.actual} (expected ${primary.expected})` : "Configuration drift",
    remediation,
    source: "deterministic",
  };
}

export async function explainWithModel(input: {
  decision: Decision;
  score: number;
  checks: RuleResult[];
  intent: TransactionIntent;
  observed: ObservedConfig;
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
            "You explain already-determined security decisions for Preflight. You MUST NOT change the decision, score, or any rule status. Return compact JSON only: {summary, mainRisk, remediation}. Two or three sentences max in summary. No markdown.",
        },
        {
          role: "user",
          content: JSON.stringify({
            decision: input.decision,
            score: input.score,
            intent: input.intent,
            configSource: input.observed.source,
            dvn: `${input.observed.requiredDvnCount}/${input.observed.requiredDvns.length}`,
            checks: input.checks.map((c) => ({
              id: c.id,
              status: c.status,
              expected: c.expected,
              actual: c.actual,
              explanation: c.explanation,
            })),
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
