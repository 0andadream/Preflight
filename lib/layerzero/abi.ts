export const endpointAbi = [
  {
    type: "function",
    name: "getSendLibrary",
    stateMutability: "view",
    inputs: [
      { name: "_sender", type: "address" },
      { name: "_dstEid", type: "uint32" },
    ],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "getReceiveLibrary",
    stateMutability: "view",
    inputs: [
      { name: "_receiver", type: "address" },
      { name: "_srcEid", type: "uint32" },
    ],
    outputs: [
      { type: "address" },
      { name: "isDefault", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "getConfig",
    stateMutability: "view",
    inputs: [
      { name: "_oapp", type: "address" },
      { name: "_lib", type: "address" },
      { name: "_eid", type: "uint32" },
      { name: "_configType", type: "uint32" },
    ],
    outputs: [{ type: "bytes" }],
  },
  {
    type: "function",
    name: "delegates",
    stateMutability: "view",
    inputs: [{ name: "oapp", type: "address" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "defaultSendLibrary",
    stateMutability: "view",
    inputs: [{ name: "_eid", type: "uint32" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "defaultReceiveLibrary",
    stateMutability: "view",
    inputs: [{ name: "_eid", type: "uint32" }],
    outputs: [{ type: "address" }],
  },
] as const;

export const ulnAbi = [
  {
    type: "function",
    name: "getUlnConfig",
    stateMutability: "view",
    inputs: [
      { name: "_oapp", type: "address" },
      { name: "_remoteEid", type: "uint32" },
    ],
    outputs: [
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
    ],
  },
] as const;

export const oappAbi = [
  { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  {
    type: "function",
    name: "peers",
    stateMutability: "view",
    inputs: [{ name: "_eid", type: "uint32" }],
    outputs: [{ type: "bytes32" }],
  },
] as const;
