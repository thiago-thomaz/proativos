import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPipelineSummary } from "@/services/revenue/crm-engine";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:crm:pipeline");

export async function GET(req: NextRequest) {
  try {
    apiLogger.info("Obtendo sumário do pipeline CRM");
    const org = await prisma.organization.findFirst();
    if (!org) {
      apiLogger.warn("Organização não encontrada para pipeline CRM");
      return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });
    }

    const summary = await getPipelineSummary(org.id);
    apiLogger.info("Sumário do pipeline CRM recuperado", { orgId: org.id, totalDeals: summary.totalDeals });
    return NextResponse.json({ success: true, ...summary });
  } catch (error: any) {
    apiLogger.error("Erro ao obter sumário do pipeline", { error: error.message, stack: error.stack });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
