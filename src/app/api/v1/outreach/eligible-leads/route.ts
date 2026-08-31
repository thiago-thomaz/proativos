import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkOutreachEligibility } from "@/services/outreach-eligibility";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("campaignId");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!campaignId) {
      return NextResponse.json(
        { error: "Parâmetro 'campaignId' é obrigatório." },
        { status: 400 }
      );
    }

    const leads = await prisma.lead.findMany({
      where: {
        campaignId,
        status: { in: ["QUALIFIED", "NEW", "READY_TO_CONTACT", "CONTACTED"] },
        cadenceStatus: { notIn: ["STOPPED", "COMPLETED"] },
      },
      take: limit,
      include: {
        company: {
          include: { contacts: true },
        },
      },
    });

    const eligibleLeads = [];

    for (const lead of leads) {
      const eligibility = await checkOutreachEligibility(lead.id, campaignId, {
        ignoreBusinessHoursForTesting: true,
      });

      if (eligibility.eligible) {
        eligibleLeads.push({
          leadId: lead.id,
          company: {
            cnpj: lead.company.cnpj,
            razaoSocial: lead.company.razaoSocial,
            municipio: lead.company.municipio,
            uf: lead.company.uf,
          },
          score: lead.score,
          contactabilityScore: lead.contactabilityScore,
          recommendedChannel: eligibility.recommendedChannel,
          targetContact: eligibility.targetContact,
          reasons: eligibility.reasons,
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalChecked: leads.length,
      totalEligible: eligibleLeads.length,
      eligibleLeads,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Falha ao buscar leads elegíveis", detail: error.message },
      { status: 500 }
    );
  }
}
