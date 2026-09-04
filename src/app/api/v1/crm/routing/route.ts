import { NextRequest, NextResponse } from "next/server";
import { routeLeadToOwner } from "@/services/revenue/lead-routing";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:crm:routing");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    apiLogger.info("Roteando lead para proprietário", { leadId: body.leadId });

    if (!body.leadId) {
      apiLogger.warn("leadId ausente no roteamento");
      return NextResponse.json({ error: "leadId é obrigatório" }, { status: 400 });
    }

    const result = await routeLeadToOwner(body.leadId);
    apiLogger.info("Lead roteado com sucesso", { leadId: body.leadId, routed: result.routed });
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    apiLogger.error("Erro no roteamento de lead", { error: error.message, stack: error.stack });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
