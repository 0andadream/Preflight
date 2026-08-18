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
          Same primitive, three ways to call it. The model still cannot change the decision.
        </p>

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
  agent: "Demo Treasury Agent",
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
          <div className="mono-label text-lime">x402 paid checks</div>
          <h2 className="mt-2 text-lg">HTTP 402 on /api/preflight/paid</h2>
          <p className="mt-2 max-w-2xl text-sm text-paper-300">
            Agents without a payment proof get 402 and an X Layer USDT0 requirement. The UI demo
            route stays free. Settlement proof is EIP-712; a facilitator can settle later.
          </p>
          <button type="button" className="btn-lime mt-4 h-10 px-5" onClick={demoPay}>
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
