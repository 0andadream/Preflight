import type { Address } from "viem";
import type { ExpectedAssumptions } from "@/types";

export type NetworkKey = "xlayer" | "arbitrum";

export type NetworkDef = {
  key: NetworkKey;
  label: string;
  chainId: number;
  eid: number;
  aliases: string[];
};

export const NETWORKS: Record<NetworkKey, NetworkDef> = {
  xlayer: {
    key: "xlayer",
    label: "X Layer",
    chainId: 196,
    eid: 30274,
    aliases: ["xlayer", "x layer", "x-layer", "okb", "okx"],
  },
  arbitrum: {
    key: "arbitrum",
    label: "Arbitrum",
    chainId: 42161,
    eid: 30110,
    aliases: ["arbitrum", "arb", "arbitrum one"],
  },
};

export const XLAYER = {
  chainId: 196,
  eid: 30274,
  label: "X Layer",
  endpoint: "0x1a44076050125825900e736c501f859c50fE728c" as Address,
  sendUln302: "0xe1844c5D63a9543023008D332Bd3d2e6f1FE1043" as Address,
  receiveUln302: "0x2367325334447C5E1E0f1b3a6fB947b262F58312" as Address,
  executor: "0xcCE466a522984415bC91338c232d98869193D46e" as Address,
  deadDvn: "0xac9dc8415B2348d8135eC725E8e9B1F1DFaF8E53" as Address,
} as const;

export const DVN_DIRECTORY: Record<string, string> = {
  "0x9c061c9a4782294eef65ef28cb88233a987f4bdd": "LayerZero Labs",
  "0x28af4dadbc5066e994986e8bb105240023dc44b6": "Nethermind",
  "0xdd7b5e1db4aafd5c8ec3b764efb8ed265aa5445b": "Horizen",
  "0xe97c32055197b2e4c8c709106bbc855216165327": "01node",
  "0x8ddf05f9a5c488b4973897e278b58895bf87cb24": "Polyhedra zkBridge",
  "0x8befb8cd9529e539b095251ea3a058e710225d30": "Paxos",
  "0x047d9dbe4fc6b5c916f37237f547f9f42809935a": "Canary",
  "0xac9dc8415b2348d8135ec725e8e9b1f1dfaf8e53": "LZ Dead DVN",
  "0x6de0d56e2d695db9e2b4fbeca3d81372c59848bb": "USDT0",
  "0x2ae36a544b904f2f2960f6fd1a6084b4b11ba334": "Frax",
  "0x1a92c25cb7cd80e1138e8125fc0a0b0642688c0b": "Curve",
  "0x47fe112e334f5f766db3c44f7c1813468240ede9": "StablecoinX",
  "0x6667966d9ff99375156cbd554f74075d4f19d19f": "Deutsche Telekom",
  "0xa32b5c9fc4dab9f647229f04b2f1456e042d9cbd": "P2P",
  "0xa415a8c7fb53ddacbc5bcc3e0be6a400e9bd0df5": "Nansen",
};

export const USDT0_XLAYER = {
  symbol: "USDT0",
  name: "USD₮0",
  address: "0x779Ded0c9e1022225f8E0630b35a9b54bE713736" as Address,
  owner: "0x4DFF9b5b0143E642a3F63a5bcf2d1C328e600bf8" as Address,
  decimals: 6,
};

export const DEMO_AGENT = "Demo Treasury Agent";

export const DEMO_POLICY = {
  maxTransferAmount: 1000,
  allowedDestinations: ["arbitrum"],
  allowedTokens: ["USDT0"],
} as const;

export function resolveNetwork(raw: string): NetworkDef | null {
  const key = raw.trim().toLowerCase();
  for (const net of Object.values(NETWORKS)) {
    if (net.aliases.includes(key) || net.key === key || net.label.toLowerCase() === key) {
      return net;
    }
  }
  return null;
}

export function dvnName(address: string): string {
  return DVN_DIRECTORY[address.toLowerCase()] ?? shortAddress(address);
}

export function shortAddress(address: string): string {
  if (!address || address.length < 10) return address || "—";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

const DEAD_SENTINELS = new Set([
  XLAYER.deadDvn.toLowerCase(),
  "0x000000000000000000000000000000000000dead",
]);

export function isDeadDvn(address: string): boolean {
  return DEAD_SENTINELS.has(address.toLowerCase());
}

export const DEFAULT_ASSUMPTIONS: ExpectedAssumptions = {
  minRequiredDvns: 2,
  forbidDeadDvn: true,
  minConfirmations: 15,
  expectedSendLibrary: XLAYER.sendUln302,
  expectedReceiveLibrary: XLAYER.receiveUln302,
  expectedExecutor: XLAYER.executor,
  expectedEndpoint: XLAYER.endpoint,
  expectedTokenAddress: USDT0_XLAYER.address,
  destinationMustBePeer: true,
  ownerMustBeSet: true,
};
