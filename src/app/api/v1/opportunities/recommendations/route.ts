import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/opportunities/recommendations
 * Painel "O que eu deveria fazer agora?" com recomendações acionáveis
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");

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
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao consultar recomendações" },
      { status: 500 }
    );
  }
}
