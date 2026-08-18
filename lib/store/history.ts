import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
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

export async function listHistory() {
  const items = await readAll();
  const today = new Date().toISOString().slice(0, 10);
  const todays = items.filter((i) => i.at.slice(0, 10) === today);
  const pool = todays.length ? todays : items;
  return {
    total: pool.length,
    allowed: pool.filter((i) => i.decision === "ALLOW").length,
    warnings: pool.filter((i) => i.decision === "WARN").length,
    blocked: pool.filter((i) => i.decision === "BLOCK").length,
    latest: items[0] ?? null,
    items: items.slice(0, 20),
  };
}
