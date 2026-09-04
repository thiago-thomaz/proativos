import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:opportunities:recommendations");

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/opportunities/recommendations
 * Painel "O que eu deveria fazer agora?" com recomendações acionáveis
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");
    apiLogger.info("Buscando recomendações de oportunidades", { organizationId });

    const whereOrg = organizationId ? { organizationId } : {};

    const [veryHighList, readyList, enrichedList] = await Promise.all([
      prisma.opportunityScore.findMany({
        where: {
          ...whereOrg,
          priority: "VERY_HIGH",
          recommendedAction: "CONTACT_NOW",
        },
        include: {
          company: { include: { contacts: true } },
          lead: true,
          campaign: true,
        },
        take: 20,
      }),
      prisma.opportunityScore.findMany({
        where: {
          ...whereOrg,
          recommendedAction: "CONTACT_TODAY",
        },
        include: {
          company: { include: { contacts: true } },
          lead: true,
        },
        take: 20,
      }),
      prisma.opportunityScore.findMany({
        where: {
          ...whereOrg,
          recommendedAction: "ENRICH_FIRST",
        },
        include: { company: true },
        take: 20,
      }),
    ]);

    const verifiedWhatsAppCount = veryHighList.filter((item) =>
      item.company.contacts.some((c) => c.whatsappStatus === "VERIFIED" || c.whatsapp)
    ).length;

    const validEmailCount = veryHighList.filter((item) =>
      item.company.contacts.some((c) => c.emailStatus === "FORMAT_VALID" || c.email)
    ).length;

    const potentialMRR = veryHighList.length * 1500;

    apiLogger.info("Recomendações processadas", {
      veryHighCount: veryHighList.length,
      readyCount: readyList.length,
      enrichedCount: enrichedList.length,
    });

    return NextResponse.json({
      success: true,
      recommendationSummary: {
        veryHighCount: veryHighList.length,
        verifiedWhatsAppCount,
        validEmailCount,
        withinIdealWindow: veryHighList.length,
        potentialMRR,
        actionTitle: `${veryHighList.length} oportunidades VERY_HIGH aguardando contato`,
        suggestedAction: "CONTACT_NOW",
      },
      readyToContactNow: veryHighList,
      readyToContactToday: readyList,
      needsEnrichment: enrichedList,
    });
  } catch (error: any) {
    apiLogger.error("Erro ao consultar recomendações", { error: error.message, stack: error.stack });
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao consultar recomendações" },
      { status: 500 }
    );
  }
}
