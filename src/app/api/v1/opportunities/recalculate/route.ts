import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  calculateOpportunityScore,
  persistOpportunityScore,
} from "@/services/opportunity-intelligence";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/opportunities/recalculate
 * Recalcula em lote as oportunidades de uma organização ou campanha
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { organizationId, campaignId, limit = 100 } = body;

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "organizationId é obrigatório" },
        { status: 400 }
      );
    }

    const leads = await prisma.lead.findMany({
      where: {
        organizationId,
        ...(campaignId ? { campaignId } : {}),
      },
      include: {
        company: { include: { contacts: true } },
        campaign: true,
      },
      take: limit,
    });

    let processedCount = 0;
    for (const lead of leads) {
      const oppResult = calculateOpportunityScore(
        {
          id: lead.company.id,
          cnpj: lead.company.cnpj,
          razaoSocial: lead.company.razaoSocial,
          nomeFantasia: lead.company.nomeFantasia,
          dataAbertura: lead.company.dataAbertura,
          situacao: lead.company.situacao,
          cnaePrincipal: lead.company.cnaePrincipal,
          cnaesSecundarios: lead.company.cnaesSecundarios ? JSON.parse(lead.company.cnaesSecundarios) : [],
          municipio: lead.company.municipio,
          uf: lead.company.uf,
          porte: lead.company.porte,
          capitalSocial: lead.company.capitalSocial,
          telefone: lead.company.telefone,
          email: lead.company.email,
          contacts: lead.company.contacts,
        },
        {
          organizationId,
          campaignId: lead.campaignId,
          icpFilters: lead.campaign.icpFilters ? JSON.parse(lead.campaign.icpFilters) : {},
          leadId: lead.id,
          leadStatus: lead.status,
        }
      );

      await persistOpportunityScore(
        lead.companyId,
        {
          organizationId,
          campaignId: lead.campaignId,
          leadId: lead.id,
          leadStatus: lead.status,
        },
        oppResult
      );

      processedCount++;
    }

    return NextResponse.json({
      success: true,
      processedCount,
      organizationId,
      campaignId: campaignId || "ALL",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao recalcular oportunidades" },
      { status: 500 }
    );
  }
}
