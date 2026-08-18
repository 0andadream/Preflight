import type { AgentPolicy } from "@/types";

export const DEMO_AGENT = "Demo Treasury Agent";

export const TREASURY_VAULT = "0x1111111111111111111111111111111111111111";
export const OKX_DEX_ROUTER = "0x2222222222222222222222222222222222222222";
export const UNKNOWN_ADDRESS = "0x9999999999999999999999999999999999999999";

export const ADDRESS_LABELS: Record<string, string> = {
  [TREASURY_VAULT.toLowerCase()]: "Treasury Vault",
  [OKX_DEX_ROUTER.toLowerCase()]: "OKX DEX Router",
  [UNKNOWN_ADDRESS.toLowerCase()]: "Unknown",
};

export const DEMO_POLICY: AgentPolicy = {
  maxTransactionAmount: 1000,
  allowedTokens: ["USDT", "USDC", "OKB"],
  allowedContracts: [OKX_DEX_ROUTER],
  allowedRecipients: [TREASURY_VAULT],
  maxSlippageBps: 100,
};

export function policyForAgent(_agent: string): AgentPolicy {
  return {
    maxTransactionAmount: DEMO_POLICY.maxTransactionAmount,
    allowedTokens: [...DEMO_POLICY.allowedTokens],
    allowedContracts: [...DEMO_POLICY.allowedContracts],
    allowedRecipients: [...DEMO_POLICY.allowedRecipients],
    maxSlippageBps: DEMO_POLICY.maxSlippageBps,
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
