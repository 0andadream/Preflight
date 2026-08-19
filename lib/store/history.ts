import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildSeedHistory } from "@/lib/demo/catalog";
import { formatAmount } from "@/lib/policy/defaults";
import type { PreflightResult, TxAction } from "@/types";

const FILE = path.join(process.cwd(), ".data", "history.json");

export type HistoryEntry = {
  id: string;
  at: string;
  decision: PreflightResult["decision"];
  score: number;
  policyHash: string;
  agent: string;
  action: TxAction;
  amount: number;
  amountLabel: string;
  token: string;
  recipient: string;
  simulated: boolean;
  attestationTx?: string;
  explorerUrl?: string;
  demo?: boolean;
  headline?: string;
};

async function readAll(): Promise<HistoryEntry[]> {
  try {
    const raw = await readFile(FILE, "utf8");
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

export async function appendHistory(result: PreflightResult): Promise<HistoryEntry> {
  const entry: HistoryEntry = {
    id: result.policyHash,
    at: result.record.timestamp,
    decision: result.decision,
    score: result.score,
    policyHash: result.policyHash,
    agent: result.intent.agent,
    action: result.intent.action,
    amount: result.intent.amount,
    amountLabel: formatAmount(result.intent.amount),
    token: result.intent.token,
    recipient: result.intent.recipient,
    simulated: result.source === "simulation",
    attestationTx: result.attestation.txHash,
  };
  const all = await readAll();
  all.unshift(entry);
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(all.slice(0, 200), null, 2));
  return entry;
}

export async function listAgentHistory(agent: string) {
  const all = await readAll();
  return all.filter((i) => i.agent === agent);
}

function mergeHistory(live: HistoryEntry[]): HistoryEntry[] {
  const byId = new Map<string, HistoryEntry>();
  for (const row of buildSeedHistory()) byId.set(row.policyHash, row);
  for (const row of live) byId.set(row.policyHash, { ...row, demo: row.demo ?? false });
  return [...byId.values()].sort((a, b) => (a.at < b.at ? 1 : -1));
}

export async function listHistory() {
  const items = mergeHistory(await readAll());
  const demo = items.filter((i) => i.demo);
  const live = items.filter((i) => !i.demo);
  return {
    total: items.length,
    allowed: items.filter((i) => i.decision === "ALLOW").length,
    warnings: items.filter((i) => i.decision === "WARN").length,
    blocked: items.filter((i) => i.decision === "BLOCK").length,
    latest: live[0] ?? items[0] ?? null,
    items: [...live.slice(0, 12), ...demo],
  };
}
