import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const FILE = path.join(process.cwd(), ".data", "x402-nonces.json");

export async function consumeNonce(nonce: string): Promise<boolean> {
  let used: string[] = [];
  try {
    used = JSON.parse(await readFile(FILE, "utf8")) as string[];
  } catch {
    used = [];
  }
  if (used.includes(nonce)) return false;
  used.push(nonce);
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(used.slice(-500)));
  return true;
}
