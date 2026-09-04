import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticatePublicApiRequest } from "@/services/revenue/public-api-guard";
import { checkOutreachEligibility } from "@/services/outreach-eligibility";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:public:outreach:preview");

export async function POST(req: NextRequest) {
  const auth = await authenticatePublicApiRequest(req, "OUTREACH");
  if (!auth.valid) {
    apiLogger.warn("Falha na autenticação da API pública de preview de outreach", { error: auth.error });
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode || 401 });
  }

  try {
    const body = await req.json();
    apiLogger.info("Gerando preview de outreach via API pública", { leadId: body.leadId, campaignId: body.campaignId });

    if (!body.leadId) {
      apiLogger.warn("leadId ausente no preview público de outreach");
      return NextResponse.json({ error: "leadId é obrigatório" }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({ where: { id: body.leadId } });
    if (!lead) {
      apiLogger.warn("Lead não encontrado para preview público de outreach", { leadId: body.leadId });
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }

    const campaignId = body.campaignId || lead.campaignId;
    const eligibility = await checkOutreachEligibility(body.leadId, campaignId, {
      simulationMode: true,
    });

    apiLogger.info("Preview de outreach retornado com sucesso", { leadId: body.leadId, eligible: eligibility.eligible });

    return NextResponse.json({ success: true, data: eligibility });
  } catch (error: any) {
    apiLogger.error("Erro no preview de outreach via API pública", { error: error.message, stack: error.stack });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
