import { prisma } from "@/lib/prisma";
import { routeLeadToOwner } from "./lead-routing";
import { sendSmartNotification } from "./notification-engine";

/**
 * Autonomous Sales Loop Coordinator (Fase 7)
 * Executa varreduras de inteligência para identificar:
 * 1. Oportunidades quentes não contatadas
 * 2. Leads que necessitam de distribuição/roteamento
 * 3. Leads qualificados que responderam e requerem agendamento
 */
export async function runAutonomousSalesLoop(organizationId: string) {
  const actionsTaken: string[] = [];

  // 1. Identificar Leads sem Owner e rotear automaticamente
  const unassignedLeads = await prisma.lead.findMany({
    where: { organizationId, ownerId: null, score: { gte: 70 } },
    take: 10,
  });

  for (const lead of unassignedLeads) {
    const routeRes = await routeLeadToOwner(lead.id);
    if (routeRes.routed) {
      actionsTaken.push(`Lead ${lead.id} atribuído para ${routeRes.ownerName}`);
    }
  }

  // 2. Identificar Oportunidades VERY_HIGH recém-geradas para alertar o time
  const hotOpportunities = await prisma.opportunityScore.findMany({
    where: { organizationId, priority: "VERY_HIGH", opportunityScore: { gte: 85 } },
    orderBy: { calculatedAt: "desc" },
    take: 5,
  });

  for (const opp of hotOpportunities) {
    await sendSmartNotification({
      organizationId,
      type: "HIGH_OPPORTUNITY",
      title: "🔥 Oportunidade Quente Identificada",
      message: `Score ${opp.opportunityScore}/100: ${opp.recommendedAction}`,
      link: `/opportunities/${opp.id}`,
    });
    actionsTaken.push(`Alerta gerado para oportunidade quente ${opp.id}`);
  }

  return {
    success: true,
    organizationId,
    actionsCount: actionsTaken.length,
    actionsTaken,
  };
}
