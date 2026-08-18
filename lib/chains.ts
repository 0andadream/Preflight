import { defineChain } from "viem";

export const xLayer = defineChain({
  id: 196,
  name: "X Layer",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.XLAYER_RPC_URL || "https://rpc.xlayer.tech", "https://xlayerrpc.okx.com"],
    },
  },
  blockExplorers: {
    default: { name: "XLayerScan", url: "https://xlayerscan.com" },
  },
});

export const xLayerTestnet = defineChain({
  id: 1952,
  name: "X Layer Testnet",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.XLAYER_TESTNET_RPC_URL || "https://testrpc.xlayer.tech/terigon",
        "https://xlayertestrpc.okx.com/terigon",
      ],
    },
  },
  blockExplorers: {
    default: { name: "OKX Explorer", url: "https://www.okx.com/web3/explorer/xlayer-test" },
  },
  testnet: true,
});

export function explorerTx(chainId: number, hash: string) {
  if (chainId === 196) return `https://xlayerscan.com/tx/${hash}`;
  if (chainId === 1952) return `https://www.okx.com/web3/explorer/xlayer-test/tx/${hash}`;
  return `#${hash}`;
}

export function explorerAddress(chainId: number, address: string) {
  if (chainId === 196) return `https://xlayerscan.com/address/${address}`;
  if (chainId === 1952) return `https://www.okx.com/web3/explorer/xlayer-test/address/${address}`;
  return `#${address}`;
}
