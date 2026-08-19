/**
 * Run the demo catalog through the real preflight pipeline.
 *
 *   pnpm seed              labeled demo hashes (safe to repeat)
 *   pnpm seed -- --onchain write attestations on X Layer testnet
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { SEED_CATALOG, evaluateSeed } from "../lib/demo/catalog";
import { runPreflight } from "../lib/preflight/run";
import { appendHistory } from "../lib/store/history";

const onchain = process.argv.includes("--onchain");

async function main() {
  const rows = [];
  for (const spec of SEED_CATALOG) {
    const preview = evaluateSeed(spec);
    const result = await runPreflight({
      ...spec.request,
      agent: spec.request.agent || preview.intent.agent,
      attest: onchain,
    });
    const entry = await appendHistory(result);
    rows.push({
      id: spec.id,
      headline: spec.headline,
      decision: result.decision,
      score: result.score,
      policyHash: result.policyHash,
      written: result.attestation.written,
      txHash: result.attestation.txHash ?? null,
      demo: !result.attestation.written,
    });
    console.log(
      `${result.decision.padEnd(5)} ${String(result.score).padStart(3)}  ${spec.headline}${
        result.attestation.txHash ? `  ${result.attestation.txHash}` : ""
      }`,
    );
    void entry;
  }

  const out = path.join(process.cwd(), ".data", "seed-run.json");
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, JSON.stringify({ onchain, at: new Date().toISOString(), rows }, null, 2));
  console.log(`\n${rows.length} preflights. ${onchain ? "Attempted testnet attestations." : "Labeled demo pipeline (no chain writes)."}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
