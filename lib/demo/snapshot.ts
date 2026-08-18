import { DEFAULT_ASSUMPTIONS, USDT0_XLAYER, XLAYER, dvnName } from "@/lib/layerzero/networks";
import type { ObservedConfig, TransactionIntent } from "@/types";

/** Baseline security assumption used by Demo Treasury Agent: 2-of-2 required DVNs. */
const SAFE_DVNS = [
  "0x9c061c9A4782294eeF65EF28cB88233A987F4bDd",
  "0x6DE0d56e2D695dB9e2b4FbECA3d81372C59848bB",
] as const;

export function demoSafeConfig(intent: TransactionIntent, destEid: number): ObservedConfig {
  return {
    source: "demo-snapshot",
    tokenAddress: USDT0_XLAYER.address,
    tokenSymbol: "USDT0",
    tokenName: "USD₮0",
    endpoint: XLAYER.endpoint,
    sendLibrary: XLAYER.sendUln302,
    receiveLibrary: XLAYER.receiveUln302,
    receiveLibraryIsDefault: false,
    executor: XLAYER.executor,
    confirmations: 20,
    requiredDvnCount: 2,
    requiredDvns: SAFE_DVNS.map((address) => ({ address, name: dvnName(address) })),
    optionalDvnCount: 0,
    optionalDvnThreshold: 0,
    optionalDvns: [],
    owner: USDT0_XLAYER.owner,
    delegate: USDT0_XLAYER.owner,
    peer: "0x00000000000000000000000014e4c61d6aa9accda625b0679cc597a0f126937",
    peerConfigured: true,
    sourceEid: XLAYER.eid,
    destinationEid: destEid,
    sourceChainId: XLAYER.chainId,
  };
}

/** Simulation overlay: DVN threshold 2/2 → 1/2. Clearly labeled SIMULATION. */
export function applyDriftSimulation(config: ObservedConfig): ObservedConfig {
  const first = config.requiredDvns[0] ?? {
    address: SAFE_DVNS[0],
    name: dvnName(SAFE_DVNS[0]),
  };
  return {
    ...config,
    source: "simulation",
    requiredDvnCount: 1,
    requiredDvns: [first],
  };
}

export function driftedIntent(intent: TransactionIntent): TransactionIntent {
  return { ...intent, amount: 5000 };
}

export { DEFAULT_ASSUMPTIONS };
