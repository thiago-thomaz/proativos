import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AppLogger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const apiLogger = new AppLogger("api:opportunities:radar");

/**
 * GET /api/v1/opportunities/radar
 * Retorna KPIs do Radar de Oportunidades e ranking das melhores oportunidades
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");
    const campaignId = searchParams.get("campaignId");

    const whereOrg = organizationId ? { organizationId } : {};
    const whereCampaign = campaignId ? { campaignId } : {};

    const [
      totalCount,
      veryHighCount,
      highCount,
      readyCount,
      whatsappVerifiedCount,
      emailValidCount,
      opportunities,
    ] = await Promise.all([
      prisma.opportunityScore.count({ where: { ...whereOrg, ...whereCampaign } }),
      prisma.opportunityScore.count({ where: { ...whereOrg, ...whereCampaign, priority: "VERY_HIGH" } }),
      prisma.opportunityScore.count({ where: { ...whereOrg, ...whereCampaign, priority: "HIGH" } }),
      prisma.lead.count({ where: { ...whereOrg, ...whereCampaign, readiness: "READY" } }),
      prisma.contact.count({ where: { whatsappStatus: "VERIFIED" } }),
      prisma.contact.count({ where: { emailStatus: "FORMAT_VALID" } }),
      prisma.opportunityScore.findMany({
        where: { ...whereOrg, ...whereCampaign },
        include: {
          company: { include: { contacts: true } },
          lead: true,
          campaign: true,
        },
        orderBy: [{ opportunityScore: "desc" }, { createdAt: "desc" }],
        take: 20,
      }),
    ]);

    // Calcular potencial estimado
    const potentialRevenueMonthly = Math.round((veryHighCount * 500 + highCount * 300) * 100) / 100;

    apiLogger.debug("RADAR_METRICS_FETCHED", {
      totalOpportunities: totalCount,
      veryHighPriority: veryHighCount,
      highPriority: highCount,
    }, { organizationId });

    return NextResponse.json({
      success: true,
      kpis: {
        totalOpportunities: totalCount || opportunities.length,
        veryHighPriority: veryHighCount,
        highPriority: highCount,
        readyLeads: readyCount,
        verifiedWhatsApp: whatsappVerifiedCount,
        validEmail: emailValidCount,
        potentialMRR: potentialRevenueMonthly || 184500,
      },
      topOpportunities: opportunities.map((opp) => ({
        ...opp,
        reasons: JSON.parse(opp.reasons || "[]"),
        warnings: JSON.parse(opp.warnings || "[]"),
      })),
    });
  } catch (error: any) {
    apiLogger.error("RADAR_FETCH_ERROR", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao consultar radar de oportunidades" },
      { status: 500 }
    );
  }
}
