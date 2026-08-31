import { prisma } from "@/lib/prisma";
import { checkOutreachEligibility } from "./outreach-eligibility";
import { estimateOperationCost } from "./cost-controller";

export interface DryRunSimulationResult {
  mode: "DRY_RUN";
  campaignId: string;
  campaignName: string;
  totalLeadsEvaluated: number;
  wouldSend: number;
  wouldBlock: number;
  estimatedCredits: number;
  estimatedCostUSD: number;
  channelDistribution: {
    whatsapp: number;
    email: number;
  };
  blockedReasonsSummary: Record<string, number>;
  simulatedAt: Date;
}

/**
 * Motor de Simulação Global em Modo Dry Run (Fase 6)
 */
export async function executeDryRunSimulation(
  campaignId: string
): Promise<DryRunSimulationResult> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      leads: {
        include: {
          company: {
            include: { contacts: true },
          },
        },
      },
      organization: true,
    },
  });

  if (!campaign) {
    throw new Error(`Campanha '${campaignId}' não encontrada.`);
  }

  let wouldSend = 0;
  let wouldBlock = 0;
  let whatsappCount = 0;
  let emailCount = 0;
  const blockedReasonsSummary: Record<string, number> = {};

  for (const lead of campaign.leads) {
    const eligibility = await checkOutreachEligibility(lead.id, campaign.id, {
      simulationMode: true,
    });

    if (eligibility.eligible) {
      wouldSend++;
      if (eligibility.recommendedChannel === "WHATSAPP") {
        whatsappCount++;
      } else {
        emailCount++;
      }
    } else {
      wouldBlock++;
      for (const reason of eligibility.blockedReasons) {
        blockedReasonsSummary[reason] = (blockedReasonsSummary[reason] || 0) + 1;
      }
    }
  }

  const { estimatedCostUSD, requiredCredits } = await estimateOperationCost(
    "whatsappSend",
    wouldSend
  );

  // Registrar auditoria da simulação Dry Run
  await prisma.n8nExecutionAudit.create({
    data: {
      organizationId: campaign.organizationId,
      campaignId: campaign.id,
      workflowName: "PLE - Outreach Dispatcher",
      executionId: `dryrun-${Date.now()}`,
      operation: "DRY_RUN_SIMULATION",
      status: "DRY_RUN",
      recordsCount: campaign.leads.length,
      metadata: JSON.stringify({
        wouldSend,
        wouldBlock,
        estimatedCredits: requiredCredits,
        estimatedCostUSD,
      }),
    },
  });

  return {
    mode: "DRY_RUN",
    campaignId: campaign.id,
    campaignName: campaign.name,
    totalLeadsEvaluated: campaign.leads.length,
    wouldSend,
    wouldBlock,
    estimatedCredits: requiredCredits,
    estimatedCostUSD,
    channelDistribution: {
      whatsapp: whatsappCount,
      email: emailCount,
    },
    blockedReasonsSummary,
    simulatedAt: new Date(),
  };
}
