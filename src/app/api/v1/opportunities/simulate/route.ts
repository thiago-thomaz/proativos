import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateOpportunityScore } from "@/services/opportunity-intelligence";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/opportunities/simulate
 * Simulador 2.0: Previsão de oportunidades, funil e custos sem efeitos colaterais
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      organizationId,
      campaignId,
      productPrice = 500,
      periodicity = "MONTHLY",
      estimatedConversionRate = 0.05,
      simulatedLeadLimit = 500,
    } = body;

    const companies = await prisma.company.findMany({
      take: simulatedLeadLimit,
      include: { contacts: true },
    });

    let universeCount = companies.length;
    let icpMatchedCount = 0;
    let contactableCount = 0;
    let readyCount = 0;
    let opportunityHighPlusCount = 0;
    let whatsAppCount = 0;
    let emailCount = 0;

    for (const company of companies) {
      const oppResult = calculateOpportunityScore(
        {
          cnpj: company.cnpj,
          razaoSocial: company.razaoSocial,
          nomeFantasia: company.nomeFantasia,
          dataAbertura: company.dataAbertura,
          situacao: company.situacao,
          cnaePrincipal: company.cnaePrincipal,
          cnaesSecundarios: company.cnaesSecundarios ? JSON.parse(company.cnaesSecundarios) : [],
          municipio: company.municipio,
          uf: company.uf,
          porte: company.porte,
          capitalSocial: company.capitalSocial,
          telefone: company.telefone,
          email: company.email,
          contacts: company.contacts,
        },
        {
          organizationId: organizationId || "default-org",
          campaignId,
          financialConfig: { productPrice, periodicity, estimatedConversionRate },
        }
      );

      if (oppResult.breakdown.icpFitPoints >= 15) icpMatchedCount++;
      if (oppResult.breakdown.contactabilityPoints >= 8) contactableCount++;
      if (oppResult.opportunityScore >= 75) opportunityHighPlusCount++;
      if (oppResult.recommendedAction === "CONTACT_NOW" || oppResult.recommendedAction === "CONTACT_TODAY") {
        readyCount++;
      }
      if (company.contacts.some((c) => c.whatsappStatus === "VERIFIED" || c.whatsapp)) whatsAppCount++;
      if (company.contacts.some((c) => c.emailStatus === "FORMAT_VALID" || c.email)) emailCount++;
    }

    const estimatedMessages = readyCount * 2;
    const estimatedCost = Math.round(readyCount * 1.5 * 100) / 100;
    const estimatedDeals = Math.round(readyCount * estimatedConversionRate);
    const estimatedRevenue = estimatedDeals * productPrice;
    const estimatedMRR = periodicity === "MONTHLY" ? estimatedRevenue : Math.round(estimatedRevenue / 12);

    return NextResponse.json({
      success: true,
      simulation: {
        universeCount,
        icpMatchedCount,
        contactableCount,
        readyCount,
        opportunityHighPlusCount,
        whatsAppCount,
        emailCount,
        neverContactedCount: readyCount,
        estimatedMessages,
        estimatedCost,
        estimatedDeals,
        estimatedRevenue,
        estimatedMRR,
        cadenceTimeline: {
          day0: { eligibleLeads: readyCount, action: "Disparo do Step 1" },
          day3: { estimatedFollowUps: Math.round(readyCount * 0.7), action: "Follow-up Step 2" },
          day6: { estimatedFollowUps: Math.round(readyCount * 0.4), action: "Follow-up Step 3" },
        },
        mode: "SIMULATION",
        sideEffects: false,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao executar simulação de oportunidades" },
      { status: 500 }
    );
  }
}
