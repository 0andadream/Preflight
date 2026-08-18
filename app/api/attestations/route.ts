import { NextResponse } from "next/server";
import { listHistory } from "@/lib/store/history";

export const runtime = "nodejs";

export async function GET() {
  const data = await listHistory();
  return NextResponse.json(data);
}
