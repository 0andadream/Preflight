import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getAddress, isAddress } from "viem";
import { AGENT_ROSTER, shortAddress } from "@/lib/policy/defaults";

const FILE = path.join(process.cwd(), ".data", "agents.json");

export type RegisteredAgent = {
  address: `0x${string}`;
  agent: string;
  chainId: number;
};

const BOOTSTRAP: RegisteredAgent[] = AGENT_ROSTER.map((a) => ({
  address: a.address,
  agent: a.name,
  chainId: a.chainId,
}));

export async function listAgents(): Promise<RegisteredAgent[]> {
  let saved: RegisteredAgent[] = [];
  try {
    saved = JSON.parse(await readFile(FILE, "utf8")) as RegisteredAgent[];
  } catch {
    saved = [];
  }

  const byAddr = new Map<string, RegisteredAgent>();
  for (const row of BOOTSTRAP) byAddr.set(row.address.toLowerCase(), row);
  for (const row of saved) {
    const key = row.address.toLowerCase();
    const prev = byAddr.get(key);
    const name =
      !row.agent || row.agent === "Demo Treasury Agent" ? (prev?.agent ?? row.agent) : row.agent;
    byAddr.set(key, { ...row, agent: name });
  }

  const merged = [...byAddr.values()];
  await saveAgents(merged);
  return merged;
}

export async function registerAgent(input: { address: string; agent?: string; chainId?: number }) {
  if (!isAddress(input.address)) throw new Error("invalid address");
  const address = getAddress(input.address);
  const next: RegisteredAgent = {
    address,
    agent: input.agent?.trim() || `Agent ${shortAddress(address)}`,
    chainId: input.chainId ?? 1952,
  };
  const all = await listAgents();
  const merged = [next, ...all.filter((a) => a.address.toLowerCase() !== next.address.toLowerCase())];
  await saveAgents(merged);
  return next;
}

async function saveAgents(agents: RegisteredAgent[]) {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(agents, null, 2));
}

export function agentByAddress(agents: RegisteredAgent[], address: string) {
  return agents.find((a) => a.address.toLowerCase() === address.toLowerCase()) ?? null;
}
