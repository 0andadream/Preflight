export const attestationAbi = [
  {
    type: "function",
    name: "attest",
    stateMutability: "nonpayable",
    inputs: [
      { name: "policyHash", type: "bytes32" },
      { name: "decision", type: "uint8" },
      { name: "score", type: "uint8" },
      { name: "agentId", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "records",
    stateMutability: "view",
    inputs: [{ name: "policyHash", type: "bytes32" }],
    outputs: [
      { name: "policyHash", type: "bytes32" },
      { name: "decision", type: "uint8" },
      { name: "score", type: "uint8" },
      { name: "timestamp", type: "uint64" },
      { name: "attester", type: "address" },
      { name: "agentId", type: "bytes32" },
    ],
  },
  {
    type: "event",
    name: "Attested",
    inputs: [
      { name: "policyHash", type: "bytes32", indexed: true },
      { name: "attester", type: "address", indexed: true },
      { name: "agentId", type: "bytes32", indexed: false },
      { name: "decision", type: "uint8", indexed: false },
      { name: "score", type: "uint8", indexed: false },
      { name: "timestamp", type: "uint64", indexed: false },
    ],
  },
] as const;

export const DECISION_CODE = { ALLOW: 0, WARN: 1, BLOCK: 2 } as const;
