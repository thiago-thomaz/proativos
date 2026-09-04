import { prisma } from "@/lib/prisma";
import { RoiMetrics } from "@/lib/types";
import { AppLogger } from "@/lib/logger";

const roiLogger = new AppLogger("roi");

/**
 * Motor Determinístico de ROI & Unit Economics (Fase 7)
 * Centraliza fórmulas e impede divergência de cálculos entre backend e frontend
 */
export async function calculateOrganizationRoi(organizationId: string): Promise<RoiMetrics> {
  const [leads, deals, messages, creditAccount] = await prisma.$transaction([
    prisma.lead.findMany({ where: { organizationId } }),
    prisma.deal.findMany({ where: { organizationId } }),
    prisma.outreachMessage.findMany({ where: { organizationId } }),
    prisma.creditAccount.findUnique({
      where: { organizationId },
      include: { transactions: true },
    }),
  ]);

  const leadsGenerated = leads.length;
  const qualifiedLeads = leads.filter((l) => l.score >= 70).length;
  const contactedCount = leads.filter((l) => l.contactedAt !== null).length;
  const responseCount = leads.filter((l) => l.respondedAt !== null).length;
  const positiveResponses = deals.filter((d) => d.stage !== "LOST").length;
  const meetingsBooked = deals.filter((d) => ["MEETING", "PROPOSAL", "NEGOTIATION", "WON"].includes(d.stage)).length;
  const proposalsSent = deals.filter((d) => ["PROPOSAL", "NEGOTIATION", "WON"].includes(d.stage)).length;
  const dealsWon = deals.filter((d) => d.stage === "WON");

  const totalRevenue = dealsWon.reduce((acc, d) => acc + (d.actualValue || d.expectedValue || 0), 0);

  // Estimativa de Custos
  const totalCreditsUsed = creditAccount?.transactions
    ?.filter((t) => t.amount < 0)
    ?.reduce((acc, t) => acc + Math.abs(t.amount), 0) || 0;

  const costPerCredit = 0.5; // R$ 0,50 por crédito estimado
  const creditCost = totalCreditsUsed * costPerCredit;
  const outreachCost = messages.length * 0.2; // Custo estimado de telefonia/provedores
  const enrichmentCost = totalCreditsUsed * 0.3;
  const totalCost = creditCost + outreachCost + enrichmentCost || 100; // Evitar divisão por zero

  const netProfit = totalRevenue - totalCost;
  const roiPercentage = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;
  const roas = totalCost > 0 ? totalRevenue / totalCost : 0;
  const cac = dealsWon.length > 0 ? totalCost / dealsWon.length : totalCost;
  const cpl = leadsGenerated > 0 ? totalCost / leadsGenerated : totalCost;
  const cpql = qualifiedLeads > 0 ? totalCost / qualifiedLeads : totalCost;
  const costPerMeeting = meetingsBooked > 0 ? totalCost / meetingsBooked : totalCost;
  const averageDealValue = dealsWon.length > 0 ? totalRevenue / dealsWon.length : 1000;
  const ltv = averageDealValue * 12; // Anualizado (12 meses de retenção média)

  const metrics: RoiMetrics = {
    leadsGenerated,
    qualifiedLeads,
    contactedCount,
    responseCount,
    positiveResponses,
    meetingsBooked,
    proposalsSent,
    dealsWon: dealsWon.length,
    totalRevenue,
    outreachCost,
    enrichmentCost,
    creditCost,
    totalCost,
    netProfit,
    roiPercentage,
    roas,
    cac,
    cpl,
    cpql,
    costPerMeeting,
    ltv,
  };

  roiLogger.info("ROI_CALCULATED", {
    organizationId,
    totalRevenue,
    totalCost,
    roiPercentage,
    dealsWon: dealsWon.length,
  }, { organizationId });

  return metrics;
}
