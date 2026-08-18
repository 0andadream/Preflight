import { createPublicClient, decodeAbiParameters, fallback, http, isAddressEqual, zeroAddress } from "viem";
import { xLayer } from "@/lib/chains";
import { endpointAbi, oappAbi, ulnAbi } from "@/lib/layerzero/abi";
import { dvnName, isDeadDvn, resolveNetwork, USDT0_XLAYER, XLAYER } from "@/lib/layerzero/networks";
import { applyDriftSimulation, demoSafeConfig } from "@/lib/demo/snapshot";
import type { ObservedConfig, TransactionIntent } from "@/types";

const EXECUTOR_CONFIG = [
  { type: "tuple", components: [
    { name: "maxMessageSize", type: "uint32" },
    { name: "executor", type: "address" },
  ] },
] as const;

const ULN_CONFIG = [
  {
    type: "tuple",
    components: [
      { name: "confirmations", type: "uint64" },
      { name: "requiredDVNCount", type: "uint8" },
      { name: "optionalDVNCount", type: "uint8" },
      { name: "optionalDVNThreshold", type: "uint8" },
      { name: "requiredDVNs", type: "address[]" },
      { name: "optionalDVNs", type: "address[]" },
    ],
  },
] as const;

function client() {
  return createPublicClient({
    chain: xLayer,
    transport: fallback(
      xLayer.rpcUrls.default.http.map((url) => http(url, { timeout: 8_000 })),
    ),
  });
}

function bytes32ToAddress(value: `0x${string}`): string | null {
  if (!value || value === "0x" + "0".repeat(64)) return null;
  const addr = `0x${value.slice(-40)}` as `0x${string}`;
  if (isAddressEqual(addr, zeroAddress)) return null;
  return addr;
}

export async function readObservedConfig(intent: TransactionIntent): Promise<ObservedConfig> {
  const dest = resolveNetwork(intent.destinationChain);
  const destEid = dest?.eid ?? 0;
  const snapshot = demoSafeConfig(intent, destEid);

  try {
    const publicClient = client();
    const oapp = USDT0_XLAYER.address;

    const [symbol, name, owner, sendLibrary, receiveLib, delegate] = await Promise.all([
      publicClient.readContract({ address: oapp, abi: oappAbi, functionName: "symbol" }).catch(() => "USDT0"),
      publicClient.readContract({ address: oapp, abi: oappAbi, functionName: "name" }).catch(() => "USD₮0"),
      publicClient.readContract({ address: oapp, abi: oappAbi, functionName: "owner" }).catch(() => null),
      publicClient.readContract({
        address: XLAYER.endpoint,
        abi: endpointAbi,
        functionName: "getSendLibrary",
        args: [oapp, destEid || XLAYER.eid],
      }),
      publicClient.readContract({
        address: XLAYER.endpoint,
        abi: endpointAbi,
        functionName: "getReceiveLibrary",
        args: [oapp, destEid || XLAYER.eid],
      }),
      publicClient
        .readContract({
          address: XLAYER.endpoint,
          abi: endpointAbi,
          functionName: "delegates",
          args: [oapp],
        })
        .catch(() => null),
    ]);

    const receiveLibrary = receiveLib[0];
    const receiveLibraryIsDefault = receiveLib[1];

    let confirmations = snapshot.confirmations;
    let requiredDvnCount = snapshot.requiredDvnCount;
    let requiredDvns = snapshot.requiredDvns;
    let optionalDvnCount = 0;
    let optionalDvnThreshold = 0;
    let optionalDvns = snapshot.optionalDvns;
    let executor = snapshot.executor;

    try {
      const uln = await publicClient.readContract({
        address: sendLibrary,
        abi: ulnAbi,
        functionName: "getUlnConfig",
        args: [oapp, destEid || 30110],
      });
      confirmations = Number(uln.confirmations);
      requiredDvnCount = Number(uln.requiredDVNCount);
      optionalDvnCount = Number(uln.optionalDVNCount);
      optionalDvnThreshold = Number(uln.optionalDVNThreshold);
      requiredDvns = uln.requiredDVNs.map((address) => ({ address, name: dvnName(address) }));
      optionalDvns = uln.optionalDVNs.map((address) => ({ address, name: dvnName(address) }));
    } catch {
      try {
        const raw = await publicClient.readContract({
          address: XLAYER.endpoint,
          abi: endpointAbi,
          functionName: "getConfig",
          args: [oapp, sendLibrary, destEid || 30110, 2],
        });
        const [decoded] = decodeAbiParameters(ULN_CONFIG, raw);
        confirmations = Number(decoded.confirmations);
        requiredDvnCount = Number(decoded.requiredDVNCount);
        optionalDvnCount = Number(decoded.optionalDVNCount);
        optionalDvnThreshold = Number(decoded.optionalDVNThreshold);
        requiredDvns = decoded.requiredDVNs.map((address) => ({ address, name: dvnName(address) }));
        optionalDvns = decoded.optionalDVNs.map((address) => ({ address, name: dvnName(address) }));
      } catch {
        // keep snapshot ULN numbers — still mix in live libraries/owner
      }
    }

    try {
      const raw = await publicClient.readContract({
        address: XLAYER.endpoint,
        abi: endpointAbi,
        functionName: "getConfig",
        args: [oapp, sendLibrary, destEid || 30110, 1],
      });
      const [decoded] = decodeAbiParameters(EXECUTOR_CONFIG, raw);
      executor = decoded.executor;
    } catch {
      // keep snapshot executor
    }

    let peer: string | null = null;
    try {
      const peerRaw = await publicClient.readContract({
        address: oapp,
        abi: oappAbi,
        functionName: "peers",
        args: [destEid || 30110],
      });
      peer = bytes32ToAddress(peerRaw);
    } catch {
      peer = snapshot.peer;
    }

    const liveIsUnpinnedDefault =
      requiredDvns.some((d) => isDeadDvn(d.address)) ||
      requiredDvnCount === 0 ||
      requiredDvns.length === 0;

    // Unconfigured pathways inherit LayerZero's Dead DVN default.
    // That is not USDT0's documented security stack — do not present it as live posture.
    if (liveIsUnpinnedDefault) {
      return {
        ...snapshot,
        source: "demo-snapshot",
        tokenName: String(name),
        sendLibrary,
        receiveLibrary,
        receiveLibraryIsDefault,
        executor,
        owner,
        delegate: delegate && !isAddressEqual(delegate, zeroAddress) ? delegate : snapshot.delegate,
        peer: peer ?? snapshot.peer,
        peerConfigured: Boolean(peer ?? snapshot.peer),
      };
    }

    return {
      source: "onchain",
      tokenAddress: oapp,
      tokenSymbol: String(symbol).replace("₮", "T"),
      tokenName: String(name),
      endpoint: XLAYER.endpoint,
      sendLibrary,
      receiveLibrary,
      receiveLibraryIsDefault,
      executor,
      confirmations,
      requiredDvnCount,
      requiredDvns,
      optionalDvnCount,
      optionalDvnThreshold,
      optionalDvns,
      owner,
      delegate,
      peer,
      peerConfigured: Boolean(peer),
      sourceEid: XLAYER.eid,
      destinationEid: destEid,
      sourceChainId: XLAYER.chainId,
    };
  } catch {
    return snapshot;
  }
}

export async function loadConfig(intent: TransactionIntent, simulateDrift: boolean): Promise<ObservedConfig> {
  const live = await readObservedConfig(intent);
  if (simulateDrift) return applyDriftSimulation(live);
  return live;
}
