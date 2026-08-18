import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getAddress, isAddress } from "viem";
import { DEMO_AGENT } from "@/lib/policy/defaults";

const FILE = path.join(process.cwd(), ".data", "agents.json");

export type RegisteredAgent = {
  address: `0x${string}`;
  agent: string;
  chainId: number;
};

const BOOTSTRAP: RegisteredAgent[] = [
  {
    address: "0xce9D8a28b6C18158851eb1167294f5eA90CE17Ac",
    agent: DEMO_AGENT,
    chainId: 1952,
  },
];

export async function listAgents(): Promise<RegisteredAgent[]> {
  try {
    const raw = JSON.parse(await readFile(FILE, "utf8")) as RegisteredAgent[];
    if (raw.length) return raw;
  } catch {
    /* empty */
  }
  await saveAgents(BOOTSTRAP);
  return BOOTSTRAP;
}

export async function registerAgent(input: { address: string; agent?: string; chainId?: number }) {
  if (!isAddress(input.address)) throw new Error("invalid address");
  const next: RegisteredAgent = {
    address: getAddress(input.address),
    agent: input.agent?.trim() || DEMO_AGENT,
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
