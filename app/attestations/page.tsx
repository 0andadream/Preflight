"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import type { Decision, TxAction } from "@/types";

type Payload = {
  total: number;
  allowed: number;
  warnings: number;
  blocked: number;
  latest: {
    at: string;
    decision: Decision;
    score: number;
    policyHash: string;
    attestationTx?: string;
    agent: string;
    action: TxAction;
    amount: number;
    amountLabel: string;
    token: string;
    recipient: string;
  } | null;
  items: {
    at: string;
    decision: Decision;
    score: number;
    policyHash: string;
    simulated: boolean;
    action: TxAction;
    amount: number;
    amountLabel: string;
    token: string;
    agent: string;
    attestationTx?: string;
    demo?: boolean;
    headline?: string;
  }[];
};

const tone: Record<Decision, string> = {
  ALLOW: "text-allow",
  WARN: "text-warn",
  BLOCK: "text-block",
};

export default function AttestationsPage() {
  const [data, setData] = useState<Payload | null>(null);

  useEffect(() => {
    fetch("/api/attestations")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <p className="mono-label text-lime">X Layer · agent security log</p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight">Attestations</h1>
        <p className="mt-2 max-w-xl text-sm text-paper-300">
          Agent security decisions. Seeded demo rows are tagged. Live preflights append above them.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-4">
          <Stat label="Preflights" value={data?.total ?? 0} />
          <Stat label="Allowed" value={data?.allowed ?? 0} accent="text-allow" />
          <Stat label="Warnings" value={data?.warnings ?? 0} accent="text-warn" />
          <Stat label="Blocked" value={data?.blocked ?? 0} accent="text-block" />
        </div>

        {data?.latest && (
          <section className="panel mt-6 p-5">
            <div className="mono-label">Latest attestation</div>
            <div className="mt-3 flex flex-wrap items-baseline gap-3">
              <span className={`font-mono text-2xl ${tone[data.latest.decision]}`}>
                {data.latest.decision}
              </span>
              <span className="font-mono text-paper-300">{data.latest.score} / 100</span>
              <span className="text-sm text-paper-300">
                {data.latest.action} {data.latest.amountLabel} {data.latest.token}
              </span>
            </div>
            <div className="mt-2 break-all font-mono text-[11px] text-paper-500">{data.latest.policyHash}</div>
          </section>
        )}

        <section className="panel mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/[0.06] font-mono text-[10px] uppercase tracking-[0.16em] text-paper-500">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Asset</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Decision</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Policy hash</th>
                <th className="px-4 py-3">Attestation</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((row) => (
                <tr key={row.policyHash} className="border-b border-white/[0.04]">
                  <td className="px-4 py-3 font-mono text-[11px] text-paper-500">
                    {row.at.replace("T", " ").slice(11, 16)}
                  </td>
                  <td className="px-4 py-3 text-paper-300">
                    <div className="flex items-center gap-2">
                      {row.agent || "—"}
                      {row.demo ? (
                        <span className="border border-warn/40 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-warn">
                          demo
                        </span>
                      ) : null}
                    </div>
                    {row.headline ? (
                      <div className="mt-0.5 font-mono text-[10px] text-paper-500">{row.headline}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 capitalize text-paper-300">{row.action}</td>
                  <td className="px-4 py-3 font-mono">{row.token}</td>
                  <td className="px-4 py-3 font-mono tabular-nums">{row.amountLabel}</td>
                  <td className={`px-4 py-3 font-mono text-[11px] ${tone[row.decision]}`}>
                    {row.decision === "ALLOW" ? "✓" : row.decision === "BLOCK" ? "✕" : "!"} {row.decision}
                    {row.simulated ? <span className="ml-2 text-warn">SIM</span> : null}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums">{row.score}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-paper-500">
                    {row.policyHash.slice(0, 10)}…{row.policyHash.slice(-6)}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-allow">
                    {row.attestationTx ? "VERIFIED" : "HASHED"}
                  </td>
                </tr>
              ))}
              {data && data.items.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-paper-500">
                    No preflights yet.{" "}
                    <Link href="/preflight" className="text-lime">
                      Run one
                    </Link>
                    .
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="panel p-4">
      <div className="mono-label">{label}</div>
      <div className={`mt-2 font-mono text-3xl tabular-nums ${accent ?? ""}`}>{value}</div>
    </div>
  );
}
