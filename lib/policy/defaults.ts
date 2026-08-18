import type { AgentPolicy } from "@/types";

export const TREASURY_VAULT = "0x1111111111111111111111111111111111111111";
export const OKX_DEX_ROUTER = "0x2222222222222222222222222222222222222222";
export const UNKNOWN_ADDRESS = "0x9999999999999999999999999999999999999999";
export const VENDOR_DESK = "0x5555555555555555555555555555555555555555";

export const TREASURY_AGENT = "Treasury Agent";
export const MARKET_MAKER_AGENT = "Market Maker Agent";
export const OPS_PAYOUT_AGENT = "Ops Payout Agent";

/** @deprecated use TREASURY_AGENT */
export const DEMO_AGENT = TREASURY_AGENT;

export type AgentProfile = {
  name: string;
  address: `0x${string}`;
  role: string;
  chainId: number;
  policy: AgentPolicy;
};

export const AGENT_ROSTER: AgentProfile[] = [
  {
    name: TREASURY_AGENT,
    address: "0xce9D8a28b6C18158851eb1167294f5eA90CE17Ac",
    role: "Moves stables to the treasury vault",
    chainId: 1952,
    policy: {
      maxTransactionAmount: 1000,
      allowedTokens: ["USDT", "USDC", "OKB"],
      allowedContracts: [OKX_DEX_ROUTER],
      allowedRecipients: [TREASURY_VAULT],
      maxSlippageBps: 100,
    },
  },
  {
    name: MARKET_MAKER_AGENT,
    address: "0x3333333333333333333333333333333333333333",
    role: "Swaps on the OKX DEX router",
    chainId: 1952,
    policy: {
      maxTransactionAmount: 5000,
      allowedTokens: ["USDT", "USDC"],
      allowedContracts: [OKX_DEX_ROUTER],
      allowedRecipients: [OKX_DEX_ROUTER],
      maxSlippageBps: 50,
    },
  },
  {
    name: OPS_PAYOUT_AGENT,
    address: "0x4444444444444444444444444444444444444444",
    role: "Vendor USDT payouts",
    chainId: 1952,
    policy: {
      maxTransactionAmount: 250,
      allowedTokens: ["USDT"],
      allowedContracts: [],
      allowedRecipients: [VENDOR_DESK],
      maxSlippageBps: 100,
    },
  },
];

export const ADDRESS_LABELS: Record<string, string> = {
  [TREASURY_VAULT.toLowerCase()]: "Treasury Vault",
  [OKX_DEX_ROUTER.toLowerCase()]: "OKX DEX Router",
  [UNKNOWN_ADDRESS.toLowerCase()]: "Unknown",
  [VENDOR_DESK.toLowerCase()]: "Vendor Desk",
};

export const DEMO_POLICY = AGENT_ROSTER[0].policy;

function canonicalName(agent: string) {
  const raw = agent.trim();
  if (!raw || raw === "Demo Treasury Agent") return TREASURY_AGENT;
  return raw;
}

export function profileForAgent(agent: string): AgentProfile | undefined {
  const name = canonicalName(agent);
  return AGENT_ROSTER.find((a) => a.name === name);
}

export function policyForAgent(agent: string): AgentPolicy {
  const profile = profileForAgent(agent);
  const src = profile?.policy ?? AGENT_ROSTER[0].policy;
  return {
    maxTransactionAmount: src.maxTransactionAmount,
    allowedTokens: [...src.allowedTokens],
    allowedContracts: [...src.allowedContracts],
    allowedRecipients: [...src.allowedRecipients],
    maxSlippageBps: src.maxSlippageBps,
  };
}

export function labelAddress(value: string): string {
  if (!value) return "—";
  const named = ADDRESS_LABELS[value.toLowerCase()];
  if (named) return named;
  if (value.startsWith("0x") && value.length === 42) {
    return `${value.slice(0, 6)}…${value.slice(-4)}`;
  }
  return value;
}

export function normalizeToken(token: string): string {
  return token.trim().toUpperCase().replace("₮", "T").replace("USDT0", "USDT");
}

export function isUnlimited(amount: number): boolean {
  return !Number.isFinite(amount) || amount < 0;
}

export function formatAmount(amount: number, token?: string): string {
  if (isUnlimited(amount)) return token ? `UNLIMITED ${token}` : "UNLIMITED";
  const n = `$${amount.toLocaleString()}`;
  return token ? `${n} ${token}` : n;
}

export function shortAddress(address: string): string {
  if (!address || address.length < 10) return address || "agent";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
