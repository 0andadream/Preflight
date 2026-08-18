export type TxAction = "transfer" | "approve" | "swap" | "contract";

export type PreflightIntent = {
  agent?: string;
  action?: TxAction;
  token?: string;
  amount?: number;
  recipient?: string;
  contract?: string;
  functionName?: string | null;
  value?: number;
  slippageBps?: number;
  transactionData?: string;
  scenario?: "safe" | "over-limit" | "unlimited-approval" | "anomaly";
  attest?: boolean;
};

export type PreflightDecision = "ALLOW" | "WARN" | "BLOCK";

export type PreflightResponse = {
  decision: PreflightDecision;
  score: number;
  riskLabel: string;
  policyHash: `0x${string}`;
  checks: unknown[];
  explanation: string;
  mainRisk: string;
  remediation: string;
  attestation: {
    written: boolean;
    txHash?: `0x${string}`;
    explorerUrl?: string;
    reason?: string;
  };
};

export class PaymentRequiredError extends Error {
  status = 402;
  accepts: unknown;
  constructor(body: { accepts?: unknown; error?: string }) {
    super(body.error || "Payment required");
    this.accepts = body.accepts;
  }
}

export class PreflightClient {
  constructor(
    private readonly opts: {
      baseUrl: string;
      paymentHeader?: string;
    },
  ) {}

  async check(intent: PreflightIntent): Promise<PreflightResponse> {
    return this.post("/api/preflight", intent);
  }

  async checkPaid(intent: PreflightIntent): Promise<PreflightResponse> {
    return this.post("/api/preflight/paid", intent, true);
  }

  private async post(path: string, intent: PreflightIntent, paid = false): Promise<PreflightResponse> {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (paid && this.opts.paymentHeader) headers["PAYMENT-SIGNATURE"] = this.opts.paymentHeader;

    const res = await fetch(join(this.opts.baseUrl, path), {
      method: "POST",
      headers,
      body: JSON.stringify(intent),
    });

    const body = (await res.json()) as PreflightResponse & { error?: string; accepts?: unknown };
    if (res.status === 402) throw new PaymentRequiredError(body);
    if (!res.ok) throw new Error(body.error || `preflight failed (${res.status})`);
    return body;
  }
}

function join(base: string, path: string) {
  return `${base.replace(/\/$/, "")}${path}`;
}
