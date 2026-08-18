# PREflight

**Security checks before AI agents move money.**

Security middleware between autonomous AI agents and onchain value. An agent does not blindly execute a cross-chain OFT transfer. It asks Preflight first.

Preflight reads the current LayerZero configuration on **X Layer**, runs a deterministic rule engine, applies a simple agent policy, returns **ALLOW / WARN / BLOCK**, hashes a Policy Decision Record, and can attest that hash on X Layer.

```
AI Agent → Preflight → ALLOW / BLOCK → Attest on X Layer
```

AI explains. Deterministic code decides.

---

## Demo (60–90 seconds)

1. Open `/preflight`.
2. Demo Treasury Agent prepares **500 USDT0** from **X Layer → Arbitrum**.
3. **Run Preflight**. Checks pass. Decision: **ALLOW**. Policy hash is shown.
4. Click **Simulate configuration drift**.
   - DVN threshold `2 / 2` → `1 / 2` (labeled **SIMULATION**)
   - Amount becomes `$5,000` against a `$1,000` policy
5. Decision: **BLOCK**. The model explains why.
6. End: *Agents can move money autonomously. Preflight makes sure they don't move it blindly.*

---

## What this is / is not

This is a security primitive for agent-initiated OFT transfers on X Layer.

It is not a portfolio tracker, a multi-chain dashboard, a wallet, or a generic AI chatbot.

Roadmap only (not built): Agent SDK, MCP, protocol risk modules, behavioral ML, x402, wallet integrations, multi-chain fleet monitoring.

---

## Architecture

```
/app            Next.js App Router — UI + POST /api/preflight
/components     Security-focused UI
/lib
  /rules        Deterministic LayerZero / OFT checks
  /policy       max amount · allowed dest · allowed token
  /scoring      0–100 score + ALLOW / WARN / BLOCK
  /attestation  PDR keccak256 + X Layer write
  /ai           SpaceXAI (Grok) explains only
  /layerzero    X Layer endpoint / DVN / library reader
/contracts      PreflightAttestation.sol (Foundry)
/types          Shared types
```

`POST /api/preflight`

```json
{
  "agent": "Demo Treasury Agent",
  "token": "USDT0",
  "amount": 500,
  "sourceChain": "X Layer",
  "destinationChain": "arbitrum"
}
```

```json
{
  "decision": "ALLOW",
  "score": 97,
  "policyHash": "0x…",
  "checks": [],
  "explanation": "…",
  "remediation": "…"
}
```

The same route accepts `"simulateDrift": true` for the labeled attack demo.

---

## Networks

| | |
|---|---|
| Primary | X Layer mainnet |
| Chain ID | 196 |
| LayerZero EID | 30274 |
| EndpointV2 | `0x1a44076050125825900e736c501f859c50fE728c` |
| USDT0 OFT | `0x779Ded0c9e1022225f8E0630b35a9b54bE713736` |
| Attestation | X Layer testnet (1952) |

Configuration is modular. The product is not a generic multi-chain dashboard.

---

## Run

```bash
pnpm install
cp .env.example .env.local   # optional XAI_API_KEY
pnpm dev                     # http://localhost:3000
pnpm test
```

Contracts:

```bash
cd contracts
forge install foundry-rs/forge-std --no-commit
forge test -vv

# X Layer testnet
export PRIVATE_KEY=0x…
forge script script/Deploy.s.sol --rpc-url https://testrpc.xlayer.tech/terigon --broadcast --legacy
```

Then set in `.env.local`:

```
NEXT_PUBLIC_ATTESTATION_ADDRESS=0x…
ATTESTER_PRIVATE_KEY=0x…
XAI_API_KEY=                 # https://console.x.ai — explain only
```

Without those keys the engine still decides, hashes the record, and falls back to a deterministic explanation. It will not invent a transaction hash.

---

## Security principle

1. Rules are pure functions of observed config + policy.
2. Score and decision are derived only from those rule results.
3. The LLM receives the already-determined result and returns prose.
4. The LLM cannot change score, decision, or rule status.

---

## License

MIT
