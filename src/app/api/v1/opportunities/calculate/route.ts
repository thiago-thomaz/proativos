import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  calculateOpportunityScore,
  persistOpportunityScore,
} from "@/services/opportunity-intelligence";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/opportunities/calculate
 * Calcula determinísticamente o Opportunity Score para uma empresa ou lead
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyId, leadId, organizationId, campaignId, persist = true } = body;

    if (!companyId && !leadId) {
      return NextResponse.json(
        { success: false, error: "companyId ou leadId é obrigatório" },
        { status: 400 }
      );
    }

    let targetCompanyId = companyId;
    let targetOrgId = organizationId;
    let targetCampaignId = campaignId;
    let leadStatus: string | undefined;

    if (leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: { campaign: true },
      });
      if (!lead) {
        return NextResponse.json({ success: false, error: "Lead não encontrado" }, { status: 404 });
      }
      targetCompanyId = lead.companyId;
      targetOrgId = lead.organizationId;
      targetCampaignId = lead.campaignId;
      leadStatus = lead.status;
    }

    const company = await prisma.company.findUnique({
      where: { id: targetCompanyId },
      include: { contacts: true },
    });

    if (!company) {
      return NextResponse.json({ success: false, error: "Empresa não encontrada" }, { status: 404 });
    }

    let icpFilters = null;
    let campaignStatus = undefined;
    if (targetCampaignId) {
      const campaign = await prisma.campaign.findUnique({
        where: { id: targetCampaignId },
      });
      if (campaign) {
        icpFilters = campaign.icpFilters ? JSON.parse(campaign.icpFilters) : null;
        campaignStatus = campaign.status;
      }
    }

    const result = calculateOpportunityScore(
      {
        id: company.id,
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
        organizationId: targetOrgId || "default-org",
        campaignId: targetCampaignId,
        icpFilters,
        campaignStatus,
        leadId,
        leadStatus,
      }
    );

    let saved = null;
    if (persist && targetOrgId) {
      saved = await persistOpportunityScore(
        company.id,
        {
          organizationId: targetOrgId,
          campaignId: targetCampaignId,
          leadId,
          leadStatus,
        },
        result
      );
    }

    return NextResponse.json({
      success: true,
      result,
      savedId: saved?.id,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao calcular opportunity score" },
      { status: 500 }
    );
  }
}
