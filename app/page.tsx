import Link from "next/link";
import { Header } from "@/components/Header";
import { FlowStrip } from "@/components/FlowStrip";
import { Logo } from "@/components/Logo";

const SHIPPED = [
  { k: "SDK", t: "Agent SDK", d: "Thin TypeScript client over POST /api/preflight." },
  { k: "MCP", t: "MCP interface", d: "stdio tools: check, policy, history." },
  { k: "Behavior", t: "Anomaly detection", d: "Deterministic deviation from this agent's history. Warns — never overrides a policy BLOCK." },
  { k: "x402", t: "Paid checks", d: "HTTP 402 + EIP-712 payment proof for POST /api/preflight/paid." },
];

const ROADMAP = ["Wallet integrations", "Multi-chain expansion"];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 pb-20 pt-14">
        <Logo className="h-16 w-16 sm:h-20 sm:w-20" />
        <p className="mono-label mt-6 text-lime">Execution checkpoint · X Layer</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-medium tracking-tight sm:text-6xl">
          PREflight
        </h1>
        <p className="mt-4 max-w-2xl text-lg uppercase tracking-tight text-paper">
          Security checks
          <br />
          before AI agents
          <br />
          move money.
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-paper-300">
          Deterministic transaction security for autonomous agents on X Layer.
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-paper-300">
          PREflight evaluates what an AI agent is about to execute, enforces its transaction policy,
          explains the risk, and creates a verifiable security receipt on X Layer.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/preflight" className="btn-lime h-11 px-6">
            Run Preflight
          </Link>
          <Link href="/attestations" className="btn-ghost h-11 px-6">
            View attestations
          </Link>
          <Link href="/developers" className="btn-ghost h-11 px-6">
            Developers
          </Link>
        </div>

        <div className="mt-12">
          <FlowStrip />
        </div>

        <section className="mt-14 grid gap-4 md:grid-cols-3">
          {[
            {
              k: "Check",
              t: "Read the intended transaction",
              d: "Spend limit, token, recipient, contract, approval risk, slippage, and simulation on X Layer.",
            },
            {
              k: "Decide",
              t: "Deterministic ALLOW / WARN / BLOCK",
              d: "Rules and a simple agent policy compute the decision. The model cannot override it.",
            },
            {
              k: "Attest",
              t: "Agent security decision",
              d: "keccak256 of the Policy Decision Record, optionally written to X Layer.",
            },
          ].map((card) => (
            <article key={card.k} className="panel p-5">
              <div className="mono-label text-lime">{card.k}</div>
              <h2 className="mt-2 text-lg">{card.t}</h2>
              <p className="mt-2 text-sm leading-relaxed text-paper-300">{card.d}</p>
            </article>
          ))}
        </section>

        <section className="panel mt-8 p-5">
          <div className="mono-label">Principle</div>
          <p className="mt-3 text-xl tracking-tight">AI explains. Deterministic code decides.</p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-paper-300">
            Agents can move money autonomously. Preflight makes sure they don&apos;t move it blindly.
          </p>
        </section>

        <section className="mt-14">
          <div className="mono-label">Now shipping</div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {SHIPPED.map((card) => (
              <article key={card.k} className="panel p-5">
                <div className="mono-label text-lime">{card.k}</div>
                <h2 className="mt-2 text-lg">{card.t}</h2>
                <p className="mt-2 text-sm leading-relaxed text-paper-300">{card.d}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <div className="mono-label">Still roadmap</div>
          <p className="mt-3 flex flex-wrap gap-2">
            {ROADMAP.map((item) => (
              <span key={item} className="border border-white/10 px-2 py-1 font-mono text-[11px] text-paper-500">
                {item}
              </span>
            ))}
          </p>
        </section>
      </main>
    </div>
  );
}
