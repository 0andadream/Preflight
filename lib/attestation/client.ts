import { createWalletClient, http, keccak256, toBytes, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { explorerTx, xLayerTestnet } from "@/lib/chains";
import { attestationAbi, DECISION_CODE } from "@/lib/attestation/abi";
import type { AttestationResult, Decision } from "@/types";

function privateKey(): Hex | null {
  const raw = process.env.ATTESTER_PRIVATE_KEY;
  if (!raw) return null;
  return (raw.startsWith("0x") ? raw : `0x${raw}`) as Hex;
}

export async function writeAttestation(input: {
  policyHash: `0x${string}`;
  decision: Decision;
  score: number;
  agent: string;
}): Promise<AttestationResult> {
  const address = process.env.NEXT_PUBLIC_ATTESTATION_ADDRESS as `0x${string}` | undefined;
  const key = privateKey();

  if (!address || !key) {
    return {
      written: false,
      simulated: false,
      chainId: xLayerTestnet.id,
      chainLabel: "X Layer Testnet",
      policyHash: input.policyHash,
      reason: !address
        ? "Attestation contract is not deployed. Set NEXT_PUBLIC_ATTESTATION_ADDRESS after forge script."
        : "No ATTESTER_PRIVATE_KEY. Decision hash is still deterministic; onchain write skipped.",
    };
  }

  try {
    const account = privateKeyToAccount(key);
    const client = createWalletClient({
      account,
      chain: xLayerTestnet,
      transport: http(xLayerTestnet.rpcUrls.default.http[0], { timeout: 20_000 }),
    });

    const hash = await client.writeContract({
      address,
      abi: attestationAbi,
      functionName: "attest",
      args: [
        input.policyHash,
        DECISION_CODE[input.decision],
        input.score,
        keccak256(toBytes(input.agent)),
      ],
      chain: xLayerTestnet,
      account,
    });

    return {
      written: true,
      simulated: false,
      chainId: xLayerTestnet.id,
      chainLabel: "X Layer Testnet",
      policyHash: input.policyHash,
      txHash: hash,
      explorerUrl: explorerTx(xLayerTestnet.id, hash),
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "attestation failed";
    return {
      written: false,
      simulated: false,
      chainId: xLayerTestnet.id,
      chainLabel: "X Layer Testnet",
      policyHash: input.policyHash,
      reason,
    };
  }
}
