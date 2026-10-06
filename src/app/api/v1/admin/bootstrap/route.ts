import { NextRequest, NextResponse } from "next/server";
import { ensureDatabaseBootstrapped } from "@/services/bootstrap";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:admin:bootstrap");

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const force = searchParams.get("force") === "true";
    const result = await ensureDatabaseBootstrapped(force);
    apiLogger.info("BOOTSTRAP_TRIGGERED_GET", { force, result });
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    apiLogger.error("BOOTSTRAP_FAILED_GET", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    let force = false;
    try {
      const body = await req.json();
      force = Boolean(body.force);
    } catch {
      // Body vazio, padrão force = false
    }

    const result = await ensureDatabaseBootstrapped(force);
    apiLogger.info("BOOTSTRAP_TRIGGERED_POST", { force, result });
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    apiLogger.error("BOOTSTRAP_FAILED_POST", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
