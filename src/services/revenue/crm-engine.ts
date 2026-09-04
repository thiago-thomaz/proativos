import { prisma } from "@/lib/prisma";
import { CrmStage } from "@/lib/types";
import { AppLogger } from "@/lib/logger";

const crmLogger = new AppLogger("crm");

export const STAGE_PROBABILITIES: Record<CrmStage, number> = {
  NEW: 10,
  QUALIFIED: 20,
  CONTACTED: 30,
  RESPONDED: 40,
  INTERESTED: 50,
  MEETING: 60,
  PROPOSAL: 75,
  NEGOTIATION: 85,
  WON: 100,
  LOST: 0,
};

export interface CreateDealInput {
  organizationId: string;
  leadId: string;
  title?: string;
  expectedValue?: number;
  ownerId?: string;
  stage?: CrmStage;
  nextAction?: string;
  nextActionAt?: Date;
}

/**
 * Cria um novo Deal no CRM a partir de um Lead qualificado ou resposta de interesse
 */
export async function createDealFromLead(input: CreateDealInput) {
  const lead = await prisma.lead.findUnique({
    where: { id: input.leadId },
    include: { company: true, campaign: true },
  });

  if (!lead) {
    throw new Error("Lead não encontrado para criação do Deal.");
  }

  const stage: CrmStage = input.stage || "QUALIFIED";
  const probability = STAGE_PROBABILITIES[stage] || 20;
  const expectedValue = input.expectedValue || lead.campaign?.productPrice || 1000;
  const title = input.title || `Oportunidade - ${lead.company.razaoSocial}`;

  const deal = await prisma.deal.create({
    data: {
      organizationId: input.organizationId,
      leadId: lead.id,
      companyId: lead.companyId,
      campaignId: lead.campaignId,
      ownerId: input.ownerId || lead.ownerId || null,
      title,
      stage,
      probability,
      expectedValue,
      nextAction: input.nextAction || "Agendar Reunião de Demonstração",
      nextActionAt: input.nextActionAt || new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  // Registrar DealEvent de criação
  await prisma.dealEvent.create({
    data: {
      dealId: deal.id,
      eventType: "DEAL_CREATED",
      toStage: stage,
      note: `Deal criado a partir do lead ${lead.id}`,
      actorId: input.ownerId || null,
    },
  });

  crmLogger.info("DEAL_CREATED", {
    dealId: deal.id,
    leadId: lead.id,
    stage,
    expectedValue,
  }, { organizationId: input.organizationId });

  return deal;
}

/**
 * Altera o estágio do Deal com auditoria e recálculo automático de probabilidade
 */
export async function updateDealStage(params: {
  dealId: string;
  toStage: CrmStage;
  actualValue?: number;
  lostReason?: string;
  note?: string;
  actorId?: string;
}) {
  const { dealId, toStage, actualValue, lostReason, note, actorId } = params;

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
  });

  if (!deal) {
    throw new Error("Deal não encontrado.");
  }

  const fromStage = deal.stage;
  const probability = STAGE_PROBABILITIES[toStage] || 0;
  const isWon = toStage === "WON";
  const isLost = toStage === "LOST";

  const updatedDeal = await prisma.deal.update({
    where: { id: dealId },
    data: {
      stage: toStage,
      probability,
      ...(actualValue !== undefined ? { actualValue } : {}),
      ...(lostReason ? { lostReason } : {}),
      ...(isWon || isLost ? { closeDate: new Date() } : {}),
    },
  });

  // Atualizar status no Lead correlacionado
  if (isWon) {
    await prisma.lead.update({
      where: { id: deal.leadId },
      data: { status: "CONVERTED", convertedAt: new Date() },
    });
  } else if (isLost) {
    await prisma.lead.update({
      where: { id: deal.leadId },
      data: { status: "NOT_INTERESTED" },
    });
  }

  // Registrar Evento no Deal
  await prisma.dealEvent.create({
    data: {
      dealId,
      eventType: isWon ? "DEAL_WON" : isLost ? "DEAL_LOST" : "STAGE_CHANGED",
      fromStage,
      toStage,
      note: note || (isWon ? "Deal Ganho!" : isLost ? `Perdido: ${lostReason}` : `Avançou para ${toStage}`),
      actorId: actorId || null,
    },
  });

  crmLogger.info("DEAL_STAGE_UPDATED", {
    dealId,
    fromStage,
    toStage,
    probability,
    actualValue,
  }, { organizationId: deal.organizationId });

  return updatedDeal;
}

/**
 * Consulta estatísticas do pipeline consolidado por estágio
 */
export async function getPipelineSummary(organizationId: string) {
  const deals = await prisma.deal.findMany({
    where: { organizationId },
    include: {
      company: true,
      owner: true,
      campaign: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const stages: Record<string, { count: number; totalValue: number; deals: any[] }> = {};
  const allStages: CrmStage[] = [
    "NEW",
    "QUALIFIED",
    "CONTACTED",
    "RESPONDED",
    "INTERESTED",
    "MEETING",
    "PROPOSAL",
    "NEGOTIATION",
    "WON",
    "LOST",
  ];

  for (const s of allStages) {
    stages[s] = { count: 0, totalValue: 0, deals: [] };
  }

  let totalPipelineValue = 0;
  let totalWonValue = 0;

  for (const deal of deals) {
    const s = deal.stage as CrmStage;
    if (stages[s]) {
      stages[s].count++;
      const val = deal.actualValue || deal.expectedValue;
      stages[s].totalValue += val;
      stages[s].deals.push(deal);

      if (s !== "LOST") totalPipelineValue += val;
      if (s === "WON") totalWonValue += val;
    }
  }

  return {
    totalDeals: deals.length,
    totalPipelineValue,
    totalWonValue,
    stages,
  };
}
