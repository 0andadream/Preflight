import { NextResponse } from "next/server";
import { listAgents, registerAgent } from "@/lib/firewall/registry";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ agents: await listAgents() });
}

export async function POST(req: Request) {
  const body = (await req.json()) as { address?: string; agent?: string };
  try {
    const agent = await registerAgent({ address: body.address || "", agent: body.agent });
    return NextResponse.json(agent);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "invalid" }, { status: 400 });
  }
}
