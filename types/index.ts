export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type RuleStatus = "PASS" | "WARN" | "FAIL";
export type Decision = "ALLOW" | "WARN" | "BLOCK";
export type ConfigSource = "onchain" | "demo-snapshot" | "simulation";
export type RiskLabel = "SAFE" | "ELEVATED" | "HIGH RISK";

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
  maxTransferAmount: number;
  allowedDestinations: string[];
  allowedTokens: string[];
};

export type TransactionIntent = {
  agent: string;
  token: string;
  amount: number;
  sourceChain: string;
  destinationChain: string;
};

export type NamedAddress = {
  address: string;
  name: string;
};

export type ObservedConfig = {
  source: ConfigSource;
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  endpoint: string;
  sendLibrary: string;
  receiveLibrary: string;
  receiveLibraryIsDefault: boolean;
  executor: string;
  confirmations: number;
  requiredDvnCount: number;
  requiredDvns: NamedAddress[];
  optionalDvnCount: number;
  optionalDvnThreshold: number;
  optionalDvns: NamedAddress[];
  owner: string | null;
  delegate: string | null;
  peer: string | null;
  peerConfigured: boolean;
  sourceEid: number;
  destinationEid: number;
  sourceChainId: number;
};

export type ExpectedAssumptions = {
  minRequiredDvns: number;
  forbidDeadDvn: boolean;
  minConfirmations: number;
  expectedSendLibrary: string;
  expectedReceiveLibrary: string;
  expectedExecutor: string;
  expectedEndpoint: string;
  expectedTokenAddress: string;
  destinationMustBePeer: boolean;
  ownerMustBeSet: boolean;
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
  sourceChain: string;
  sourceChainId: number;
  destinationChain: string;
  asset: string;
  amount: string;
  checks: RuleResult[];
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
  agent: string;
  token: string;
  amount: number;
  sourceChain: string;
  destinationChain: string;
  simulateDrift?: boolean;
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
  observed: ObservedConfig;
  scoreBreakdown: ScoreBreakdown;
  record: PolicyDecisionRecord;
  attestation: AttestationResult;
};
