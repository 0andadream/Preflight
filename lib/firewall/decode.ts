import { decodeFunctionData, formatEther, hexToBigInt, isHex, toFunctionSelector } from "viem";
import type { TransactionIntent, TxAction } from "@/types";

const erc20Abi = [
  {
    type: "function",
    name: "transfer",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

const ATTEST_PREFIX = toFunctionSelector("attest(bytes32,uint8,uint8,bytes32)");

export type ObservedTx = {
  hash: `0x${string}`;
  from: `0x${string}`;
  to: `0x${string}` | null;
  input: `0x${string}`;
  value: bigint;
  blockNumber: bigint;
};

export function isAttestationCall(input: string) {
  return input.slice(0, 10).toLowerCase() === ATTEST_PREFIX;
}

export function decodeObservedTx(tx: ObservedTx, agentName: string, chainId: number): TransactionIntent {
  const input = tx.input && isHex(tx.input) ? tx.input : "0x";

  if (isAttestationCall(input)) {
    return {
      agent: agentName,
      chainId,
      action: "contract",
      token: "OKB",
      amount: 0,
      recipient: tx.to ?? "",
      contract: tx.to ?? "",
      functionName: "attest",
      value: Number(formatEther(tx.value)),
      slippageBps: 0,
      transactionData: input,
      decoded: true,
    };
  }

  if (!tx.to && input !== "0x") {
    return {
      agent: agentName,
      chainId,
      action: "contract",
      token: "OKB",
      amount: 0,
      recipient: "",
      contract: "",
      functionName: "constructor",
      value: Number(formatEther(tx.value)),
      slippageBps: 0,
      transactionData: input,
      decoded: true,
    };
  }

  if (!tx.to || input === "0x") {
    return {
      agent: agentName,
      chainId,
      action: "transfer",
      token: "OKB",
      amount: Number(formatEther(tx.value)),
      recipient: tx.to ?? "",
      contract: "",
      functionName: "transfer",
      value: Number(formatEther(tx.value)),
      slippageBps: 0,
      decoded: true,
    };
  }

  try {
    const decoded = decodeFunctionData({ abi: erc20Abi, data: input });
    if (decoded.functionName === "transfer") {
      const [to, amount] = decoded.args;
      return intent(agentName, chainId, "transfer", tx, to, amount, "transfer", true);
    }
    if (decoded.functionName === "approve") {
      const [spender, amount] = decoded.args;
      const unlimited = amount === hexToBigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
      return {
        ...intent(agentName, chainId, "approve", tx, spender, amount, "approve", true),
        amount: unlimited ? -1 : tokenAmount(amount),
        contract: tx.to ?? "",
      };
    }
  } catch {
    /* unknown selector */
  }

  return {
    agent: agentName,
    chainId,
    action: "contract",
    token: "OKB",
    amount: Number(formatEther(tx.value)),
    recipient: tx.to,
    contract: tx.to,
    functionName: null,
    value: Number(formatEther(tx.value)),
    slippageBps: 0,
    transactionData: input,
    decoded: false,
  };
}

function intent(
  agent: string,
  chainId: number,
  action: TxAction,
  tx: ObservedTx,
  counterpart: string,
  amount: bigint,
  fn: string,
  decoded: boolean,
): TransactionIntent {
  return {
    agent,
    chainId,
    action,
    token: "USDT",
    amount: tokenAmount(amount),
    recipient: counterpart,
    contract: action === "transfer" ? "" : (tx.to ?? ""),
    functionName: fn,
    value: Number(formatEther(tx.value)),
    slippageBps: 0,
    decoded,
  };
}

function tokenAmount(raw: bigint) {
  return Number(raw) / 1e6;
}
