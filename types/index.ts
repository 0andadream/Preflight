export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type RuleStatus = "PASS" | "WARN" | "FAIL";
export type Decision = "ALLOW" | "WARN" | "BLOCK";
export type RiskLabel = "SAFE" | "ELEVATED" | "HIGH RISK";
export type TxAction = "transfer" | "approve" | "swap" | "contract";
export type EvalSource = "evaluated" | "simulation";

export type RuleResult = {
  id: string;
  name: string;
  status: RuleStatus;
  severity: Severity;
  expected: string;
  actual: string;
  explanation: string;
};

export type AgentPolicy = {
  maxTransactionAmount: number;
  allowedTokens: string[];
  allowedContracts: string[];
  allowedRecipients: string[];
  maxSlippageBps: number;
};

export type TransactionIntent = {
  agent: string;
  chainId: number;
  action: TxAction;
  token: string;
  amount: number;
  recipient: string;
  contract: string;
  functionName: string | null;
  value: number;
  slippageBps: number;
  transactionData?: string;
  decoded: boolean;
};

export type ScoreBreakdown = {
  start: number;
  penalties: { reason: string; delta: number }[];
  total: number;
};

export type PolicyDecisionRecord = {
  version: "1.0";
  timestamp: string;
  agent: string;
  chainId: number;
  action: TxAction;
  token: string;
  amount: string;
  recipient: string;
  contract: string;
  rules: RuleResult[];
  policy: AgentPolicy;
  score: number;
  decision: Decision;
};

export type AttestationResult = {
  written: boolean;
  simulated: false;
  chainId: number;
  chainLabel: string;
  policyHash: `0x${string}`;
  txHash?: `0x${string}`;
  explorerUrl?: string;
  reason?: string;
};

export type Explanation = {
  summary: string;
  mainRisk: string;
  remediation: string;
  source: "deterministic" | "grok-4.6";
};

export type PreflightRequest = {
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

export type PreflightResult = {
  decision: Decision;
  score: number;
  riskLabel: RiskLabel;
  policyHash: `0x${string}`;
  checks: RuleResult[];
  explanation: string;
  mainRisk: string;
  remediation: string;
  explanationSource: Explanation["source"];
  intent: TransactionIntent;
  policy: AgentPolicy;
  source: EvalSource;
  scoreBreakdown: ScoreBreakdown;
  record: PolicyDecisionRecord;
  attestation: AttestationResult;
};
