import {
  DEMO_AGENT,
  OKX_DEX_ROUTER,
  TREASURY_VAULT,
  UNKNOWN_ADDRESS,
} from "@/lib/policy/defaults";
import type { PreflightRequest, TransactionIntent, TxAction } from "@/types";

export function baseIntent(partial: Partial<TransactionIntent> = {}): TransactionIntent {
  return {
    agent: DEMO_AGENT,
    chainId: 196,
    action: "transfer",
    token: "USDT",
    amount: 500,
    recipient: TREASURY_VAULT,
    contract: "",
    functionName: "transfer",
    value: 0,
    slippageBps: 50,
    decoded: true,
    ...partial,
  };
}

export function intentFromRequest(input: PreflightRequest): TransactionIntent {
  if (input.scenario === "over-limit") {
    return baseIntent({
      amount: 5000,
      recipient: UNKNOWN_ADDRESS,
      functionName: "transfer",
    });
  }
  if (input.scenario === "unlimited-approval") {
    return baseIntent({
      action: "approve",
      amount: -1,
      recipient: UNKNOWN_ADDRESS,
      contract: UNKNOWN_ADDRESS,
      functionName: "approve",
    });
  }

  const action = (input.action || "transfer") as TxAction;
  const decoded = action !== "contract" || Boolean(input.functionName);
  return baseIntent({
    agent: input.agent?.trim() || DEMO_AGENT,
    action,
    token: input.token || "USDT",
    amount: input.amount ?? 500,
    recipient: input.recipient || TREASURY_VAULT,
    contract: input.contract || (action === "swap" ? OKX_DEX_ROUTER : ""),
    functionName: input.functionName ?? defaultFn(action),
    value: input.value ?? 0,
    slippageBps: input.slippageBps ?? 50,
    transactionData: input.transactionData,
    decoded,
  });
}

function defaultFn(action: TxAction): string | null {
  if (action === "transfer") return "transfer";
  if (action === "approve") return "approve";
  if (action === "swap") return "swap";
  return null;
}
