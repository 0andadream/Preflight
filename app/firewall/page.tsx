"use client";

import { useEffect, useState } from "react";
import type { Decision } from "@/types";

import { Header } from "@/components/Header";

type Hit = {
  hash: `0x${string}`;
  explorerUrl: string;
  blockNumber: number;
  from: string;
  agent: string;
  registered: boolean;
  chainId: number;
  chainLabel: string;
  decision: Decision;
  score: number;
  gated: boolean;
  kind: "spend" | "attestation";
  demo?: boolean;
  intent: { action: string; token: string; amount: number; functionName: string | null };
};

type ChainScan = {
  chainId: number;
  chainLabel: string;
  head: number;
  senders: number;
  txs: number;
  error?: string;
};

type Payload = {
  chainLabel: string;
  chainId: number;
  head: number;
  agents: { address: string; agent: string; chainId: number }[];
  hits: Hit[];
  chains?: ChainScan[];
  scanned?: { blocks: number; senders: number; txs: number };
  error?: string;
};

const tone: Record<Decision, string> = {
  ALLOW: "text-allow",
  WARN: "text-warn",
  BLOCK: "text-block",
};

export default function FirewallPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [address, setAddress] = useState("");
  const [name, setName] = useState("");

  async function load() {
    const res = await fetch("/api/firewall?blocks=24", { cache: "no-store" });
    const body = (await res.json()) as Payload;
    setData(body);
  }

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 12_000);
    return () => window.clearInterval(id);
  }, []);

  async function addAgent(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/firewall/agents", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ address, agent: name || undefined }),
    });
    setAddress("");
    setName("");
    void load();
  }

  const hits = data?.hits ?? [];
  const blocked = hits.filter((h) => h.decision === "BLOCK").length;
  const spends = hits.filter((h) => h.kind === "spend").length;
  const named = (data?.agents ?? []).filter((a) => !a.agent.startsWith("Agent 0x"));
  const chains = data?.chains ?? [];

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <p className="mono-label text-lime">X Layer · live watcher</p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight">Firewall</h1>
        <p className="mt-2 max-w-2xl text-sm text-paper-300">
          Scans every sender in recent X Layer blocks — mainnet and testnet. Seeded demo rows (tagged)
          sit above live traffic so the page is never empty. A spend without a Preflight ALLOW is a
          BLOCK. Already-mined txs cannot be reverted.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-4">
          <Stat label="Senders" value={data?.scanned?.senders ?? 0} />
          <Stat label="Txs scanned" value={data?.scanned?.txs ?? 0} />
          <Stat label="Spends" value={spends} />
          <Stat label="Blocked" value={blocked} accent="text-block" />
        </div>

        <section className="mt-4 grid gap-3 sm:grid-cols-2">
          {chains.map((c) => (
            <div key={c.chainId} className="panel p-4">
              <div className="mono-label">{c.chainLabel}</div>
              <div className="mt-2 font-mono text-sm text-paper-300">
                head {c.head || "—"} · {c.senders} senders · {c.txs} txs
              </div>
              {c.error && <p className="mt-2 font-mono text-[11px] text-block">{c.error}</p>}
            </div>
          ))}
        </section>

        <section className="panel mt-6 p-5">
          <div className="mono-label">Named agents</div>
          <p className="mt-2 text-xs text-paper-500">
            Every on-chain sender is scanned. Naming one applies that agent&apos;s policy on top of
            the network gate.
          </p>
          <ul className="mt-3 space-y-1 font-mono text-[11px] text-paper-300">
            {named.map((a) => (
              <li key={`${a.chainId}:${a.address}`}>
                {a.agent} · {a.address}
              </li>
            ))}
          </ul>
          <form onSubmit={addAgent} className="mt-4 flex flex-wrap gap-3">
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x agent address"
              className="min-w-[280px] flex-1 border-b border-white/10 bg-transparent py-2 font-mono text-sm outline-none"
            />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Agent name"
              className="w-48 border-b border-white/10 bg-transparent py-2 font-mono text-sm outline-none"
            />
            <button type="submit" className="btn-lime h-10 px-4">
              Name
            </button>
          </form>
        </section>

        <section className="panel mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/[0.06] font-mono text-[10px] uppercase tracking-[0.16em] text-paper-500">
              <tr>
                <th className="px-4 py-3">Chain</th>
                <th className="px-4 py-3">Block</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Kind</th>
                <th className="px-4 py-3">Intent</th>
                <th className="px-4 py-3">Decision</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Gate</th>
                <th className="px-4 py-3">Tx</th>
              </tr>
            </thead>
            <tbody>
              {hits.map((row) => (
                <tr key={`${row.chainId}:${row.hash}`} className="border-b border-white/[0.04]">
                  <td className="px-4 py-3 font-mono text-[11px] text-paper-500">
                    {row.chainId === 196 ? "X Layer" : "Testnet"}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-paper-500">{row.blockNumber}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {row.agent}
                      {row.demo ? <DemoTag /> : null}
                    </div>
                    <div className="font-mono text-[10px] text-paper-500">{row.from}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] uppercase text-paper-500">{row.kind}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-paper-300">
                    {row.intent.action} {row.intent.functionName ? `· ${row.intent.functionName}` : ""}
                  </td>
                  <td className={`px-4 py-3 font-mono text-[11px] ${tone[row.decision]}`}>{row.decision}</td>
                  <td className="px-4 py-3 font-mono tabular-nums">{row.score}</td>
                  <td className={`px-4 py-3 font-mono text-[11px] ${row.gated ? "text-allow" : "text-block"}`}>
                    {row.gated ? "PASS" : "BYPASS"}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px]">
                    {row.demo || !row.explorerUrl ? (
                      <span className="text-paper-500">{row.hash.slice(0, 10)}…</span>
                    ) : (
                      <a className="text-lime hover:underline" href={row.explorerUrl} target="_blank" rel="noreferrer">
                        {row.hash.slice(0, 10)}…
                      </a>
                    )}
                  </td>
                </tr>
              ))}
              {data && hits.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-paper-500">
                    No transactions in the last {data.scanned?.blocks ?? 24} blocks on X Layer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
        {data?.error && <p className="mt-4 font-mono text-sm text-block">{data.error}</p>}
      </main>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="panel p-4">
      <div className="mono-label">{label}</div>
      <div className={`mt-2 font-mono text-3xl tabular-nums ${accent ?? ""}`}>{value}</div>
    </div>
  );
}

function DemoTag() {
  return (
    <span className="border border-warn/40 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-warn">
      demo
    </span>
  );
}
