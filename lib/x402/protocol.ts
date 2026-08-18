import { keccak256, recoverTypedDataAddress, toBytes, verifyTypedData, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const X402_ASSET = "0x779Ded0c9e1022225f8E0630b35a9b54bE713736";
export const X402_AMOUNT = "10000";
export const X402_RESOURCE = "/api/preflight/paid";

const domain = {
  name: "PREflight x402",
  version: "1",
  chainId: 196,
} as const;

const types = {
  Payment: [
    { name: "payTo", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "resource", type: "string" },
    { name: "nonce", type: "bytes32" },
    { name: "validUntil", type: "uint256" },
  ],
} as const;

export type PaymentProof = {
  payTo: `0x${string}`;
  amount: string;
  resource: string;
  nonce: `0x${string}`;
  validUntil: number;
  signature: Hex;
  from?: `0x${string}`;
};

export function paymentRequirements(payTo: `0x${string}`) {
  return {
    x402Version: 1,
    accepts: [
      {
        scheme: "exact",
        network: "eip155:196",
        maxAmountRequired: X402_AMOUNT,
        resource: X402_RESOURCE,
        description: "PREflight paid security check on X Layer",
        mimeType: "application/json",
        payTo,
        maxTimeoutSeconds: 120,
        asset: X402_ASSET,
        extra: { name: "USDT0", decimals: 6 },
      },
    ],
  };
}

export function payToAddress(): `0x${string}` {
  const raw = process.env.X402_PAY_TO || process.env.NEXT_PUBLIC_ATTESTATION_ADDRESS;
  if (raw && raw.startsWith("0x") && raw.length === 42) return raw as `0x${string}`;
  return "0xce9D8a28b6C18158851eb1167294f5eA90CE17Ac";
}

export async function signPayment(privateKey: Hex, payTo: `0x${string}`): Promise<PaymentProof> {
  const account = privateKeyToAccount(privateKey);
  const nonce = keccak256(toBytes(`${account.address}:${Date.now()}`));
  const validUntil = Math.floor(Date.now() / 1000) + 120;
  const message = {
    payTo,
    amount: BigInt(X402_AMOUNT),
    resource: X402_RESOURCE,
    nonce,
    validUntil: BigInt(validUntil),
  };
  const signature = await account.signTypedData({ domain, types, primaryType: "Payment", message });
  return {
    payTo,
    amount: X402_AMOUNT,
    resource: X402_RESOURCE,
    nonce,
    validUntil,
    signature,
    from: account.address,
  };
}

export async function verifyPayment(proof: PaymentProof, expectedPayTo: `0x${string}`): Promise<{ ok: true; from: `0x${string}` } | { ok: false; reason: string }> {
  if (proof.resource !== X402_RESOURCE) return { ok: false, reason: "wrong resource" };
  if (proof.payTo.toLowerCase() !== expectedPayTo.toLowerCase()) return { ok: false, reason: "wrong payTo" };
  if (BigInt(proof.amount) < BigInt(X402_AMOUNT)) return { ok: false, reason: "amount too low" };
  if (proof.validUntil < Math.floor(Date.now() / 1000)) return { ok: false, reason: "expired" };

  const message = {
    payTo: proof.payTo,
    amount: BigInt(proof.amount),
    resource: proof.resource,
    nonce: proof.nonce,
    validUntil: BigInt(proof.validUntil),
  };

  const valid = await verifyTypedData({
    address: (proof.from || (await recoverTypedDataAddress({ domain, types, primaryType: "Payment", message, signature: proof.signature }))) as `0x${string}`,
    domain,
    types,
    primaryType: "Payment",
    message,
    signature: proof.signature,
  }).catch(() => false);

  if (!valid) return { ok: false, reason: "bad signature" };

  const from = (proof.from ||
    (await recoverTypedDataAddress({
      domain,
      types,
      primaryType: "Payment",
      message,
      signature: proof.signature,
    }))) as `0x${string}`;

  return { ok: true, from };
}

export function parsePaymentHeader(header: string | null): PaymentProof | null {
  if (!header) return null;
  try {
    const raw = header.startsWith("{") ? header : Buffer.from(header, "base64").toString("utf8");
    const parsed = JSON.parse(raw) as PaymentProof;
    if (!parsed.signature || !parsed.nonce || !parsed.payTo) return null;
    return parsed;
  } catch {
    return null;
  }
}
