# PREflight

**Security checks before AI agents move money.**

An execution checkpoint for AI agents on **X Layer**. An agent does not blindly send a transaction. It asks Preflight first.

```
AI AGENT → INTENT → CHECK → DECIDE → EXPLAIN → ATTEST → EXECUTE
```

AI explains. Deterministic code decides.

---

## Demo

1. Open `/preflight`.
2. Demo Treasury Agent transfers **$500 USDT** to the **Treasury Vault** on X Layer.
3. **Run Preflight** → **ALLOW**.
4. **Simulate over-limit** → $5,000 to an unknown recipient → **BLOCK**.
5. **Simulate unlimited approval** → `approve(unknown, MAX_UINT256)` → **BLOCK**.

---

## What this is

A transaction-security firewall for autonomous agents on X Layer (chain ID 196).

It is not a portfolio tracker, a bridge monitor, or a generic AI chatbot.

---

## Rules

Deterministic only:

1. Spend limit
2. Token allowlist
3. Contract allowlist
4. Recipient allowlist
5. Unlimited approval
6. Slippage limit
7. Simulation / revert
8. Value / gas anomaly

The model never sets `decision`, `score`, or rule status.

---

## Run

```bash
pnpm install
pnpm dev
pnpm test
```

Attestation is live on **X Layer testnet** (1952):

| | |
|---|---|
| Contract | `0xe366979430FA3874DfBFAf7579484D5F8a1aBB1D` |
| Deploy tx | `0x54b6540164f5266f7f5d13a58ed1d2f41e53fd0911d3777a0eaaf1d77e1edd69` |
| Explorer | https://www.okx.com/web3/explorer/xlayer-test/address/0xe366979430FA3874DfBFAf7579484D5F8a1aBB1D |

```bash
cd contracts
forge test -vv
export PRIVATE_KEY=0x…
forge script script/Deploy.s.sol --rpc-url https://testrpc.xlayer.tech/terigon --broadcast --legacy
```

---

## Agent API

`POST /api/preflight`

```json
{
  "agent": "Demo Treasury Agent",
  "action": "transfer",
  "token": "USDT",
  "amount": 500,
  "recipient": "0x1111111111111111111111111111111111111111"
}
```

Scenarios: `"over-limit"` · `"unlimited-approval"`.

---

## License

MIT
