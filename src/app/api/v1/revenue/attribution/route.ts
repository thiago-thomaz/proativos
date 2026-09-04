import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { attributeDealRevenue, getRevenueAttributionReport } from "@/services/revenue/attribution-engine";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:revenue:attribution");

export async function GET(req: NextRequest) {
  try {
    apiLogger.info("Obtendo relatório de atribuição de receita");
    const org = await prisma.organization.findFirst();
    if (!org) {
      apiLogger.warn("Organização não encontrada para atribuição");
      return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });
    }

    const report = await getRevenueAttributionReport(org.id);
    apiLogger.info("Relatório de atribuição gerado", { orgId: org.id });
    return NextResponse.json({ success: true, ...report });
  } catch (error: any) {
    apiLogger.error("Erro ao obter relatório de atribuição", { error: error.message, stack: error.stack });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    apiLogger.info("Calculando atribuição de receita de deal", { dealId: body.dealId, model: body.model });

    const org = await prisma.organization.findFirst();
    if (!org) {
      apiLogger.warn("Organização não encontrada para atribuição de deal");
      return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });
    }

    const result = await attributeDealRevenue({
      organizationId: org.id,
      dealId: body.dealId,
      totalRevenue: body.totalRevenue,
      model: body.model,
    });

    apiLogger.info("Atribuição de deal processada com sucesso", { dealId: body.dealId });
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    apiLogger.error("Erro ao processar atribuição de deal", { error: error.message, stack: error.stack });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
