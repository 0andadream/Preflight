"use client";

import { useState } from "react";
import { Header } from "@/components/Header";

export default function DevelopersPage() {
  const [paid, setPaid] = useState<string>("");

  async function demoPay() {
    setPaid("signing…");
    const sign = await fetch("/api/x402/demo-pay", { method: "POST" });
    const signed = (await sign.json()) as { header?: string; error?: string };
    if (!sign.ok || !signed.header) {
      setPaid(signed.error || "sign failed");
      return;
    }
    const unpaid = await fetch("/api/preflight/paid", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amount: 500, token: "USDT" }),
    });
    const challenge = await unpaid.json();
    const paidRes = await fetch("/api/preflight/paid", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "PAYMENT-SIGNATURE": signed.header,
      },
      body: JSON.stringify({ amount: 500, token: "USDT" }),
    });
    const body = await paidRes.json();
    setPaid(
      JSON.stringify(
        {
          first: { status: unpaid.status, accepts: challenge.accepts?.[0]?.network },
          then: { status: paidRes.status, decision: body.decision, payment: body.payment },
        },
        null,
        2,
      ),
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <p className="mono-label text-lime">X Layer · agent interfaces</p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight">Developers</h1>
        <p className="mt-2 max-w-2xl text-sm text-paper-300">
          The judged demo is /preflight → /firewall → /attestations. Everything below is an extra
          integration surface for judges who want to poke at the API.
        </p>

        <section className="panel mt-8 grid gap-6 p-5 md:grid-cols-2">
          <div>
            <div className="mono-label text-allow">Working in the demo today</div>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-paper-300">
              <li>
                Deterministic ALLOW / WARN / BLOCK on /preflight, including Scenario A (healthy) and
                Scenario B (over-limit + DVN drop).
              </li>
              <li>
                Check-by-check breakdown and a written explanation. Grok runs only when{" "}
                <span className="font-mono text-[11px]">XAI_API_KEY</span> is set; otherwise the
                explanation is deterministic fallback.
              </li>
              <li>
                Attestation writes on X Layer testnet when the attester key is present. Policy hash is
                always computed, even if the write is skipped.
              </li>
              <li>
                /firewall live scan of recent X Layer senders, plus labeled demo rows so the page is
                never empty.
              </li>
              <li>/attestations log of seeded + live preflights.</li>
            </ul>
          </div>
          <div>
            <div className="mono-label text-warn">Early — not production-hardened</div>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-paper-300">
              <li>
                <span className="font-mono text-[11px]">@preflight/sdk</span> is a thin HTTP client
                around POST /api/preflight. Typed, small, not a published package registry release.
              </li>
              <li>
                MCP stdio server exposes check / policy / history. Fine for a local agent; not a hosted
                MCP network.
              </li>
              <li>
                x402 paid checks verify an EIP-712 proof locally. There is no USDT0 facilitator
                settlement. Not part of the core demo.
              </li>
              <li>
                Live firewall cannot revert a mined EOA transaction. Blocking execution requires{" "}
                <span className="font-mono text-[11px]">PreflightFirewall.execute()</span>.
              </li>
            </ul>
          </div>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <article className="panel p-5">
            <div className="mono-label text-lime">Agent SDK</div>
            <h2 className="mt-2 text-lg">@preflight/sdk</h2>
            <pre className="mt-3 overflow-x-auto font-mono text-[11px] leading-relaxed text-paper-300">
{`import { PreflightClient } from "@preflight/sdk";

const preflight = new PreflightClient({
  baseUrl: "http://localhost:3002",
});

const result = await preflight.check({
  agent: "Treasury Agent",
  action: "transfer",
  token: "USDT",
  amount: 500,
});

if (result.decision === "BLOCK") throw new Error(result.explanation);`}
            </pre>
          </article>

          <article className="panel p-5">
            <div className="mono-label text-lime">MCP</div>
            <h2 className="mt-2 text-lg">stdio server</h2>
            <pre className="mt-3 overflow-x-auto font-mono text-[11px] leading-relaxed text-paper-300">
{`pnpm mcp

# ~/.grok/config.toml
[mcp_servers.preflight]
command = "npx"
args = ["tsx", "mcp/server.ts"]
cwd = "/path/to/Preflight"

tools:
  preflight_check
  preflight_policy
  preflight_history`}
            </pre>
          </article>
        </section>

        <section className="panel mt-4 p-5">
          <div className="mono-label text-warn">Optional · not in the judged demo</div>
          <h2 className="mt-2 text-lg">x402 paid checks</h2>
          <p className="mt-2 max-w-2xl text-sm text-paper-300">
            Future / optional capability. Agents without a payment proof get HTTP 402 and an X Layer
            USDT0 requirement. The proof is EIP-712; this demo does not settle USDT0 through a
            facilitator. The core preflight path is free and does not use this.
          </p>
          <button type="button" className="btn-ghost mt-4 h-10 px-5" onClick={demoPay}>
            Run paid check demo
          </button>
          {paid && (
            <pre className="mt-4 overflow-x-auto font-mono text-[11px] text-paper-300">{paid}</pre>
          )}
        </section>
      </main>
    </div>
  );
}
