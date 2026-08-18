import { NextResponse } from "next/server";
import { AGENT_ROSTER } from "@/lib/policy/defaults";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    agents: AGENT_ROSTER.map((a) => ({
      name: a.name,
      address: a.address,
      role: a.role,
      chainId: a.chainId,
      policy: a.policy,
    })),
  });
}
