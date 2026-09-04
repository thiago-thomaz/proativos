import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateContactabilityScore } from "@/services/contactability";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:leads:contactability");

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
      include: {
        company: {
          include: {
            contacts: true,
          },
        },
      },
    });

    if (!lead) {
      apiLogger.warn("LEAD_NOT_FOUND_FOR_CONTACTABILITY", { leadId: params.id });
      return NextResponse.json(
        { error: "Lead não encontrado" },
        { status: 404 }
      );
    }

    const contactability = calculateContactabilityScore(
      lead.company.contacts,
      lead.score
    );

    apiLogger.debug("LEAD_CONTACTABILITY_FETCHED", {
      leadId: lead.id,
      contactabilityScore: contactability.contactabilityScore,
      priorityScore: contactability.priorityScore,
    }, { organizationId: lead.organizationId });

    return NextResponse.json({
      leadId: lead.id,
      companyId: lead.companyId,
      companyName: lead.company.razaoSocial,
      icpScore: lead.score,
      contactabilityScore: contactability.contactabilityScore,
      leadReadiness: contactability.leadReadiness,
      priorityScore: contactability.priorityScore,
      hasDecisionMaker: contactability.hasDecisionMaker,
      hasVerifiedWhatsApp: contactability.hasVerifiedWhatsApp,
      hasValidEmail: contactability.hasValidEmail,
      hasValidPhone: contactability.hasValidPhone,
      breakdown: contactability.breakdown,
      reasons: contactability.reasons,
      warnings: contactability.warnings,
      contacts: lead.company.contacts,
    });
  } catch (error: any) {
    apiLogger.error("LEAD_CONTACTABILITY_ERROR", error, { leadId: params.id });
    return NextResponse.json(
      { error: "Erro ao calcular contatabilidade do lead", detail: error.message },
      { status: 500 }
    );
  }
}
