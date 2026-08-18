#!/usr/bin/env npx tsx
/**
 * stdio MCP server for PREflight.
 *
 *   pnpm mcp
 *
 * Tools: preflight_check, preflight_policy, preflight_history
 */
import { DEMO_POLICY } from "../lib/policy/defaults";
import { runPreflight } from "../lib/preflight/run";
import { listHistory } from "../lib/store/history";
import type { TxAction } from "../types";

type JsonRpc = { jsonrpc: "2.0"; id?: number | string | null; method?: string; params?: unknown };

const tools = [
  {
    name: "preflight_check",
    description:
      "Run a deterministic PREflight security check for an AI-agent transaction on X Layer. Returns ALLOW / WARN / BLOCK. The model must not override the decision.",
    inputSchema: {
      type: "object",
      properties: {
        agent: { type: "string" },
        action: { type: "string", enum: ["transfer", "approve", "swap", "contract"] },
        token: { type: "string" },
        amount: { type: "number" },
        recipient: { type: "string" },
        contract: { type: "string" },
        attest: { type: "boolean" },
      },
    },
  },
  {
    name: "preflight_policy",
    description: "Read the Demo Treasury Agent policy currently enforced by PREflight.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "preflight_history",
    description: "List recent PREflight decisions.",
    inputSchema: { type: "object", properties: {} },
  },
];

async function callTool(name: string, args: Record<string, unknown>) {
  if (name === "preflight_policy") return DEMO_POLICY;
  if (name === "preflight_history") return listHistory();
  if (name === "preflight_check") {
    return runPreflight({
      agent: String(args.agent || "Demo Treasury Agent"),
      action: (args.action as TxAction) || "transfer",
      token: String(args.token || "USDT"),
      amount: args.amount == null ? 500 : Number(args.amount),
      recipient: args.recipient ? String(args.recipient) : undefined,
      contract: args.contract ? String(args.contract) : undefined,
      attest: args.attest !== false,
    });
  }
  throw new Error(`unknown tool: ${name}`);
}

function reply(id: JsonRpc["id"], result: unknown) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: id ?? null, result }) + "\n");
}

function fail(id: JsonRpc["id"], message: string, code = -32000) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: id ?? null, error: { code, message } }) + "\n");
}

async function handle(msg: JsonRpc) {
  const id = msg.id ?? null;
  if (msg.method === "initialize") {
    return reply(id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "preflight", version: "0.1.0" },
    });
  }
  if (msg.method === "notifications/initialized" || msg.method === "initialized") return;
  if (msg.method === "tools/list") return reply(id, { tools });
  if (msg.method === "ping") return reply(id, {});
  if (msg.method === "tools/call") {
    const params = (msg.params || {}) as { name?: string; arguments?: Record<string, unknown> };
    const result = await callTool(params.name || "", params.arguments || {});
    return reply(id, { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] });
  }
  if (msg.id != null) fail(id, `unknown method ${msg.method}`, -32601);
}

let buf = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buf += chunk;
  let idx;
  while ((idx = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    void (async () => {
      try {
        await handle(JSON.parse(line) as JsonRpc);
      } catch (err) {
        fail(null, err instanceof Error ? err.message : "parse error", -32700);
      }
    })();
  }
});
