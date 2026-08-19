"use client";

import { useMemo, useState } from "react";
import { Logo } from "@/components/Logo";
import {
  AGENT_ROSTER,
  OKX_DEX_ROUTER,
  TREASURY_AGENT,
  TREASURY_VAULT,
  UNKNOWN_ADDRESS,
  formatAmount,
  labelAddress,
  profileForAgent,
} from "@/lib/policy/defaults";
import type { PreflightResult, RuleResult, TxAction } from "@/types";

const STEPS = [
  "Agent policy",
  "Token",
  "Recipient",
  "DVN",
  "Approval risk",
  "Slippage",
  "Behavior",
  "Simulation",
] as const;

type Phase = "idle" | "reading" | "done";
type Scenario = "safe" | "compromised";

const DECISION_STYLE = {
  ALLOW: { color: "text-allow", border: "border-allow/40", bg: "bg-allow/10", mark: "✓" },
  WARN: { color: "text-warn", border: "border-warn/40", bg: "bg-warn/10", mark: "!" },
  BLOCK: { color: "text-block", border: "border-block/40", bg: "bg-block/10", mark: "✕" },
} as const;

function statusTone(status: RuleResult["status"]) {
  if (status === "PASS") return "text-allow";
  if (status === "WARN") return "text-warn";
  return "text-block";
}

export function PreflightApp() {
  const [agent, setAgent] = useState(TREASURY_AGENT);
  const [action, setAction] = useState<TxAction>("transfer");
  const [token, setToken] = useState("USDT");
  const [amount, setAmount] = useState(500);
  const [recipient, setRecipient] = useState(TREASURY_VAULT);
  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<PreflightResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState<Scenario | "custom" | null>(null);

  async function run(kind: Scenario | "custom") {
    if (kind === "safe") {
      setAgent(TREASURY_AGENT);
      setAction("transfer");
      setToken("USDT");
      setAmount(500);
      setRecipient(TREASURY_VAULT);
    }
    if (kind === "compromised") {
      setAgent(TREASURY_AGENT);
      setAction("transfer");
      setToken("USDT");
      setAmount(5000);
      setRecipient(UNKNOWN_ADDRESS);
    }

    setActive(kind);
    setError(null);
    setBusy(true);
    setPhase("reading");
    setStep(0);
    setResult(null);

    const timers = STEPS.map((_, i) => window.setTimeout(() => setStep(i + 1), 240 + i * 180));

    const body =
      kind === "safe"
        ? { agent: TREASURY_AGENT, scenario: "safe" as const, amount: 500, token: "USDT", recipient: TREASURY_VAULT }
        : kind === "compromised"
          ? { agent: TREASURY_AGENT, scenario: "compromised" as const }
          : {
              agent,
              action,
              token,
              amount,
              recipient,
              contract: action === "swap" ? OKX_DEX_ROUTER : action === "approve" ? recipient : "",
            };

    try {
      const res = await fetch("/api/preflight", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as PreflightResult & { error?: string };
      if (!res.ok) throw new Error(data.error || "preflight failed");
      await new Promise((r) => setTimeout(r, 1400));
      setResult(data);
      setPhase("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "preflight failed");
      setPhase("idle");
    } finally {
      timers.forEach(clearTimeout);
      setStep(STEPS.length);
      setBusy(false);
    }
  }

  const style = result ? DECISION_STYLE[result.decision] : null;
  const fails = useMemo(() => result?.checks.filter((c) => c.status === "FAIL") ?? [], [result]);
  const targetLabel = labelAddress(recipient);
  const profile = profileForAgent(agent);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10">
      <Logo className="h-10 w-10" />
      <p className="mono-label mt-5 text-lime">X Layer · Chain 196 · deterministic</p>
      <h1 className="mt-3 text-3xl font-medium tracking-tight">Run a preflight</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-paper-300">
        One click. An agent intent is evaluated, decided, explained, and attested. The model cannot
        change the verdict.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => run("safe")}
          className={`panel p-6 text-left transition hover:border-allow/50 ${active === "safe" ? "border-allow/40" : ""}`}
        >
          <div className="mono-label text-allow">Scenario A</div>
          <h2 className="mt-2 text-2xl tracking-tight">Healthy Route</h2>
          <p className="mt-2 text-sm text-paper-300">
            $500 USDT · Treasury Agent → Treasury Vault. In-policy. Expect ALLOW.
          </p>
          <div className="btn-lime mt-5 h-11 px-5">Run Scenario A — Healthy Route</div>
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => run("compromised")}
          className={`panel p-6 text-left transition hover:border-block/50 ${active === "compromised" ? "border-block/40" : ""}`}
        >
          <div className="mono-label text-block">Scenario B</div>
          <h2 className="mt-2 text-2xl tracking-tight">Compromised Route</h2>
          <p className="mt-2 text-sm text-paper-300">
            $5,000 USDT to an unknown recipient, DVN threshold 1 of 2. Expect BLOCK.
          </p>
          <div className="btn-block mt-5 h-11 px-5">Run Scenario B — Compromised Route</div>
        </button>
      </div>

      {phase !== "idle" && (
        <section className="panel mt-4 p-5">
          <div className="mono-label">Analyzing transaction</div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {STEPS.map((name, i) => {
              const done = step > i;
              return (
                <li key={name} className="flex items-center gap-2 font-mono text-xs">
                  <span className={done ? "text-allow" : "text-paper-500"}>{done ? "✓" : "·"}</span>
                  <span className={done ? "text-paper" : "text-paper-500"}>{name}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {error && <p className="mt-4 font-mono text-sm text-block">{error}</p>}

      {result && style && <ResultPanel result={result} style={style} fails={fails} />}

      <section className="panel mt-10 p-5 sm:p-6">
        <div className="mono-label">Custom intent</div>
        <p className="mt-2 text-sm text-paper-500">
          Optional. The two buttons above are the demo. This form is for custom inputs.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block">
            <span className="mono-label">Agent</span>
            <select
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
              className="mt-1 w-full border-b border-white/10 bg-transparent py-2 font-mono text-lg outline-none"
            >
              {AGENT_ROSTER.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mono-label">Action</span>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as TxAction)}
              className="mt-1 w-full border-b border-white/10 bg-transparent py-2 font-mono text-lg outline-none"
            >
              <option value="transfer">Transfer</option>
              <option value="approve">Approve</option>
              <option value="swap">Swap</option>
              <option value="contract">Contract</option>
            </select>
          </label>
          <Field label="Asset" value={token} onChange={setToken} />
          <label className="block">
            <span className="mono-label">Amount</span>
            <input
              type="number"
              min={-1}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="mt-1 w-full border-b border-white/10 bg-transparent py-2 font-mono text-lg outline-none"
            />
          </label>
          <div>
            <span className="mono-label">Chain</span>
            <div className="mt-1 border-b border-white/10 py-2 font-mono text-lg">X Layer</div>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            label={action === "approve" ? "Spender" : action === "swap" ? "Protocol" : "Recipient"}
            value={recipient}
            onChange={setRecipient}
          />
          <div>
            <span className="mono-label">Resolved</span>
            <div className="mt-1 border-b border-white/10 py-2 font-mono text-lg">{targetLabel}</div>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" className="btn-ghost h-11 px-6" disabled={busy} onClick={() => run("custom")}>
            Run custom preflight
          </button>
          <span className="font-mono text-[11px] text-paper-500">
            {profile
              ? `${profile.name} · max $${profile.policy.maxTransactionAmount.toLocaleString()} · ${profile.policy.allowedTokens.join(" / ")}`
              : agent}
          </span>
        </div>
      </section>
    </div>
  );
}

function ResultPanel({
  result,
  style,
  fails,
}: {
  result: PreflightResult;
  style: (typeof DECISION_STYLE)[keyof typeof DECISION_STYLE];
  fails: RuleResult[];
}) {
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[320px_1fr]">
      <aside className={`panel scanline flex flex-col items-center justify-center px-6 py-10 ${style.bg} ${style.border}`}>
        <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-paper-500">Safety score</div>
        <div className={`mt-3 font-mono text-6xl font-medium tabular-nums ${style.color}`}>
          {result.score}
          <span className="text-2xl text-paper-500"> / 100</span>
        </div>
        <div className={`mt-2 font-mono text-sm uppercase tracking-[0.18em] ${style.color}`}>{result.riskLabel}</div>
        <div className={`mt-8 font-mono text-3xl ${style.color}`}>
          {style.mark} {result.decision}
        </div>
        <SourceBadge source={result.source} />
      </aside>

      <div className="space-y-4">
        <section className="panel p-5">
          <div className="mono-label">Intent</div>
          <p className="mt-2 font-mono text-sm text-paper-300">
            {result.intent.action.toUpperCase()} · {formatAmount(result.intent.amount, result.intent.token)} · X
            Layer → {labelAddress(result.intent.recipient || result.intent.contract)}
          </p>
          {result.intent.dvnRequired != null && (
            <p className="mt-2 font-mono text-[11px] text-paper-500">
              DVN {result.intent.dvnObserved ?? 0} of {result.intent.dvnRequired}
            </p>
          )}
        </section>

        <section className="panel p-5">
          <div className="mono-label">Checks</div>
          <ul className="mt-3 divide-y divide-white/[0.05]">
            {result.checks.map((check) => (
              <li key={check.id} className="grid gap-1 py-2.5 sm:grid-cols-[1fr_auto] sm:items-baseline">
                <div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className={statusTone(check.status)}>
                      {check.status === "PASS" ? "✓" : check.status === "WARN" ? "!" : "✕"}
                    </span>
                    <span>{check.name}</span>
                  </div>
                  {check.status !== "PASS" && (
                    <div className="mt-1 pl-5 font-mono text-[11px] text-paper-500">
                      Expected {check.expected} · Observed {check.actual}
                    </div>
                  )}
                </div>
                <span className={`font-mono text-[11px] uppercase tracking-[0.14em] ${statusTone(check.status)}`}>
                  {check.status}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {fails.length > 0 && (
          <section className="panel border-block/30 p-5">
            <div className="mono-label text-block">Failures</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {fails.map((f) => (
                <div key={f.id} className="border border-white/[0.06] p-3">
                  <div className="text-sm">{f.name}</div>
                  <div className="mt-2 font-mono text-[11px] text-paper-500">
                    Expected
                    <div className="text-paper">{f.expected}</div>
                  </div>
                  <div className="mt-2 font-mono text-[11px] text-paper-500">
                    Observed
                    <div className="text-block">{f.actual}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="mono-label">AI security explanation</div>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-paper-500">
              {result.explanationSource === "grok-4.6" ? "Grok 4.6 · explain only" : "Deterministic fallback"}
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-paper">{result.explanation}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mono-label">Main risk</div>
              <p className="mt-1 text-sm text-paper-300">{result.mainRisk}</p>
            </div>
            <div>
              <div className="mono-label">Recommended action</div>
              <p className="mt-1 text-sm text-paper-300">{result.remediation}</p>
            </div>
          </div>
        </section>

        <section className="panel p-5">
          <div className="mono-label">Onchain attestation</div>
          {result.attestation.written ? (
            <div className="mt-3 text-sm text-allow">✓ Recorded on X Layer</div>
          ) : (
            <div className="mt-3 text-sm text-paper-300">
              Agent security decision hashed.
              {result.attestation.reason ? ` ${result.attestation.reason}` : ""}
            </div>
          )}
          <dl className="mt-3 space-y-1 font-mono text-[11px] text-paper-300">
            <div className="flex flex-wrap gap-2">
              <dt className="text-paper-500">Policy hash</dt>
              <dd className="break-all">{result.policyHash}</dd>
            </div>
            <div className="flex flex-wrap gap-2">
              <dt className="text-paper-500">Timestamp</dt>
              <dd>{result.record.timestamp}</dd>
            </div>
            {result.attestation.txHash && (
              <div className="flex flex-wrap gap-2">
                <dt className="text-paper-500">Transaction</dt>
                <dd>
                  <a
                    className="text-lime hover:underline"
                    href={result.attestation.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {result.attestation.txHash}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mono-label">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border-b border-white/10 bg-transparent py-2 font-mono text-lg outline-none"
      />
    </label>
  );
}

function SourceBadge({ source }: { source: PreflightResult["source"] }) {
  const label = source === "simulation" ? "SIMULATION MODE" : "X Layer evaluation";
  const tone = source === "simulation" ? "text-warn border-warn/40" : "text-paper-500 border-white/10";
  return (
    <div className={`mt-6 border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] ${tone}`}>
      {label}
    </div>
  );
}
