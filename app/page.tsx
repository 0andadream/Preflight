import Link from "next/link";
import { Header } from "@/components/Header";
import { FlowStrip } from "@/components/FlowStrip";

const ROADMAP = [
  "Agent SDK",
  "MCP interface",
  "Protocol risk modules",
  "Behavioral anomaly detection",
  "x402 paid checks",
  "Wallet integrations",
  "Multi-chain expansion",
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 pb-20 pt-14">
        <p className="mono-label text-lime">Security middleware · X Layer</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-medium tracking-tight sm:text-6xl">
          PREflight
        </h1>
        <p className="mt-4 max-w-xl text-lg text-paper">
          Security checks before AI agents move money.
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-paper-300">
          Deterministic cross-chain security verification for autonomous agents on X Layer.
          Preflight verifies whether an intended OFT transfer still satisfies its security
          assumptions before execution.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/preflight" className="btn-lime h-11 px-6">
            Run Preflight
          </Link>
          <Link href="/attestations" className="btn-ghost h-11 px-6">
            View attestations
          </Link>
        </div>

        <div className="mt-12">
          <FlowStrip />
        </div>

        <section className="mt-14 grid gap-4 md:grid-cols-3">
          {[
            {
              k: "Check",
              t: "Read live LayerZero config",
              d: "DVNs, libraries, executor, owner, peers, and OFT settings on X Layer.",
            },
            {
              k: "Decide",
              t: "Deterministic ALLOW / WARN / BLOCK",
              d: "Rules and a simple agent policy compute the decision. The model cannot override it.",
            },
            {
              k: "Attest",
              t: "Policy Decision Record",
              d: "keccak256 of the record, optionally written to X Layer as an attestation.",
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

        <section className="mt-10">
          <div className="mono-label">Not in this MVP</div>
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
