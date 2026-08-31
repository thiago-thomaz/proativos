import { NextRequest, NextResponse } from "next/server";
import { routeLeadToOwner } from "@/services/revenue/lead-routing";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.leadId) {
      return NextResponse.json({ error: "leadId é obrigatório" }, { status: 400 });
    }

    const result = await routeLeadToOwner(body.leadId);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
