import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDealFromLead } from "@/services/revenue/crm-engine";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:crm:deals");

export async function GET(req: NextRequest) {
  try {
    apiLogger.info("Listando deals do CRM");
    const org = await prisma.organization.findFirst();
    if (!org) {
      apiLogger.warn("Organização não encontrada para listar deals");
      return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });
    }

    const deals = await prisma.deal.findMany({
      where: { organizationId: org.id },
      include: { company: true, owner: true, campaign: true },
      orderBy: { updatedAt: "desc" },
    });

    apiLogger.info("Deals listados com sucesso", { orgId: org.id, count: deals.length });
    return NextResponse.json({ success: true, count: deals.length, deals });
  } catch (error: any) {
    apiLogger.error("Erro ao listar deals", { error: error.message, stack: error.stack });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    apiLogger.info("Criando deal a partir de lead", { leadId: body.leadId, title: body.title, expectedValue: body.expectedValue });
    const org = await prisma.organization.findFirst();
    if (!org) {
      apiLogger.warn("Organização não encontrada para criação de deal");
      return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });
    }

    const deal = await createDealFromLead({
      organizationId: org.id,
      leadId: body.leadId,
      title: body.title,
      expectedValue: body.expectedValue,
      ownerId: body.ownerId,
      stage: body.stage,
      nextAction: body.nextAction,
    });

    apiLogger.info("Deal criado com sucesso", { id: deal.id, title: deal.title });
    return NextResponse.json({ success: true, deal });
  } catch (error: any) {
    apiLogger.error("Erro ao criar deal", { error: error.message, stack: error.stack });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
