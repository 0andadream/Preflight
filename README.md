# PREflight

**Security checks before AI agents move money.**

A transaction firewall for autonomous agents on **X Layer**.

An agent should not send a transaction blindly. It submits the intent to Preflight. Deterministic rules decide **ALLOW / WARN / BLOCK**. Grok only explains. The decision is attested on X Layer. A watcher then scans **every sender** on recent X Layer blocks: any spend without an ALLOW is recorded as a **BLOCK**.

```
AI AGENT → INTENT → CHECK → DECIDE → EXPLAIN → ATTEST → EXECUTE
                 ↘
              X LAYER WATCHER (every sender)
```

AI explains. Deterministic code decides.

---

## What it does

Preflight is two complementary things:

1. **Checkpoint (opt-in)** — `POST /api/preflight`, the UI, the SDK, or MCP. The agent asks before it spends.
2. **Network watcher** — `/firewall` scans recent X Layer mainnet and testnet blocks for **every sender**. Roster names are labels only. A mined spend with no Preflight ALLOW is a **BYPASS / BLOCK**. Already-mined EOA transactions cannot be reverted; the agent should halt. To actually prevent a spend, the agent must call `PreflightFirewall.execute()`, which reverts unless the attestation book already has ALLOW.

It is not a portfolio tracker, a bridge monitor, or a chatbot. It watches every on-chain sender in the lookback window.

---

## Demo

```bash
pnpm install
cp .env.example .env.local   # optional XAI_API_KEY; attestation keys if you redeploy
pnpm dev                     # http://localhost:3000
pnpm test
```

### Checkpoint — `/preflight`

| Action | Expected |
|---|---|
| **Scenario A — Healthy Route** | ALLOW · $500 USDT to Treasury Vault |
| **Scenario B — Compromised Route** | BLOCK · $5,000 to unknown + DVN 1 of 2 |

A custom-intent form sits below those two buttons. x402 paid checks live on `/developers` only.

### Firewall — `/firewall`

Scans every sender in the last N blocks on X Layer mainnet (196) and testnet (1952), plus a labeled **demo** seed so the page is never empty on a fresh load.

### Developers — `/developers`

SDK snippet, MCP config, and a live x402 402 → paid retry.

---

## Rules

All deterministic. The model cannot change `decision`, `score`, or rule status.

1. Spend limit  
2. Token allowlist  
3. Contract allowlist  
4. Recipient allowlist  
5. Unlimited approval  
6. Slippage limit  
7. Simulation / revert  
8. Value / gas anomaly  
9. Behavioral envelope (WARN only — never a BLOCK by itself)  
10. Firewall gate (on-chain spend must have a prior ALLOW)

Three demo agents, each with its own policy:

| Agent | Limit | Tokens | Destination |
|---|---|---|---|
| Treasury Agent | $1,000 | USDT / USDC / OKB | Treasury Vault |
| Market Maker Agent | $5,000 | USDT / USDC | OKX DEX Router |
| Ops Payout Agent | $250 | USDT | Vendor Desk |

---

## Agent API

`POST /api/preflight` (free)

```json
{
  "agent": "Treasury Agent",
  "action": "transfer",
  "token": "USDT",
  "amount": 500,
  "recipient": "0x1111111111111111111111111111111111111111"
}
```

Scenarios: `"over-limit"` · `"unlimited-approval"` · `"anomaly"`.

`POST /api/preflight/paid` — HTTP **402** until an EIP-712 `PAYMENT-SIGNATURE` is attached (x402, X Layer USDT0).

`GET /api/firewall` — last N blocks of **every sender** on X Layer mainnet + testnet, already evaluated.

`GET|POST /api/firewall/agents` — list or name an agent address so its policy applies.

`GET /api/attestations` — decision log.

### SDK

```ts
import { PreflightClient } from "@preflight/sdk";

const preflight = new PreflightClient({ baseUrl: "http://localhost:3000" });
const result = await preflight.check({
  agent: "Treasury Agent",
  action: "transfer",
  token: "USDT",
  amount: 500,
});
if (result.decision === "BLOCK") throw new Error(result.explanation);
```

### MCP

```bash
pnpm mcp
```

```toml
# ~/.grok/config.toml
[mcp_servers.preflight]
command = "npx"
args = ["tsx", "mcp/server.ts"]
```

Tools: `preflight_check` · `preflight_policy` · `preflight_history`

---

## On-chain (X Layer testnet, 1952)

| | |
|---|---|
| Attestation | [`0xe366979430FA3874DfBFAf7579484D5F8a1aBB1D`](https://www.okx.com/web3/explorer/xlayer-test/address/0xe366979430FA3874DfBFAf7579484D5F8a1aBB1D) |
| Deploy tx | [`0x54b6540164f5266f7f5d13a58ed1d2f41e53fd0911d3777a0eaaf1d77e1edd69`](https://www.okx.com/web3/explorer/xlayer-test/tx/0x54b6540164f5266f7f5d13a58ed1d2f41e53fd0911d3777a0eaaf1d77e1edd69) |
| Firewall gate | [`0x57C84147255719060EDAa8F2B344ADB38F6a6a03`](https://www.okx.com/web3/explorer/xlayer-test/address/0x57C84147255719060EDAa8F2B344ADB38F6a6a03) |
| Firewall deploy | [`0xdd3827bc93f3e77bb684796e211d84e6523d1062abf40604512492dd863ee9ee`](https://www.okx.com/web3/explorer/xlayer-test/tx/0xdd3827bc93f3e77bb684796e211d84e6523d1062abf40604512492dd863ee9ee) |
| First ALLOW receipt | [`0x5033395bd2b6aa5a31b272331d07f99450ac9d1d2e3c4d267c516ef38011fe70`](https://www.okx.com/web3/explorer/xlayer-test/tx/0x5033395bd2b6aa5a31b272331d07f99450ac9d1d2e3c4d267c516ef38011fe70) |

Mainnet explorer (when you promote): [xlayerscan.com](https://xlayerscan.com/). Testnet receipts are on the OKX explorer above.

`PreflightAttestation.attest(policyHash, decision, score, agentId)` emits `Attested`.  
`PreflightFirewall.execute(target, value, data, policyHash)` reverts unless that hash is already ALLOW.

Redeploy:

```bash
cd contracts
forge test -vv
export PRIVATE_KEY=0x…
forge script script/Deploy.s.sol --rpc-url https://testrpc.xlayer.tech/terigon --broadcast --legacy
export ATTESTATION=0x…
forge script script/DeployFirewall.s.sol --rpc-url https://testrpc.xlayer.tech/terigon --broadcast --legacy
```

Then set in `.env.local`:

```
ATTESTER_PRIVATE_KEY=0x…
NEXT_PUBLIC_ATTESTATION_ADDRESS=0x…
XAI_API_KEY=                 # optional — Grok explains only
```

Without those keys the engine still decides and hashes the Policy Decision Record. It will not invent a transaction hash.

---

## Layout

```
app/            Next.js App Router — UI + APIs
components/     Header, preflight screen, logo
lib/
  rules/        Deterministic policy checks
  behavior/     History envelope (WARN only)
  firewall/     Decode, gate, X Layer scanner
  scoring/      0–100 + ALLOW / WARN / BLOCK
  attestation/  PDR keccak256 + X Layer write
  x402/         402 challenge + EIP-712 proof
  ai/           Explanation only
contracts/      Attestation + firewall (Foundry)
sdk/            @preflight/sdk
mcp/            stdio MCP server
```

---

## Roadmap (not built)

- Wallet integrations  
- Multi-chain expansion  

---

## License

MIT
