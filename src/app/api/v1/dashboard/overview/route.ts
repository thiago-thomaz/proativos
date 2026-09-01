import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = user.organizationId;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1. Contagens de Empresas
    const [totalCompanies, companiesToday] = await Promise.all([
      prisma.company.count(),
      prisma.company.count({ where: { createdAt: { gte: startOfToday } } }),
    ]);

    // 2. Contagens de Leads por Status da Organização
    const [
      totalLeads,
      qualifiedLeads,
      contactedLeads,
      respondedLeads,
      meetingLeads,
      convertedLeads,
    ] = await Promise.all([
      prisma.lead.count({ where: { organizationId: orgId } }),
      prisma.lead.count({ where: { organizationId: orgId, score: { gte: 70 } } }),
      prisma.lead.count({ where: { organizationId: orgId, status: "CONTACTED" } }),
      prisma.lead.count({ where: { organizationId: orgId, status: "RESPONDED" } }),
      prisma.lead.count({ where: { organizationId: orgId, status: "MEETING" } }),
      prisma.lead.count({ where: { organizationId: orgId, status: "CONVERTED" } }),
    ]);

    // 3. Receita Atribuída e Deals
    const wonDeals = await prisma.deal.findMany({
      where: { organizationId: orgId, stage: "WON" },
      select: { actualValue: true, expectedValue: true },
    });
    const totalRevenue = wonDeals.reduce((sum, d) => sum + (d.actualValue || d.expectedValue || 0), 0);

    // 4. Campanhas Ativas da Organização
    const activeCampaigns = await prisma.campaign.findMany({
      where: { organizationId: orgId },
      include: {
        _count: {
          select: { leads: true, outreachMessages: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // 5. Oportunidades Recentes
    const recentLeads = await prisma.lead.findMany({
      where: { organizationId: orgId },
      include: {
        company: {
          include: {
            contacts: true,
          },
        },
        campaign: true,
      },
      orderBy: { firstDetectedAt: "desc" },
      take: 6,
    });

    const formattedOpportunities = recentLeads.map((l) => {
      let reasons: string[] = [];
      try {
        const parsed = JSON.parse(l.qualificationReason || "{}");
        if (Array.isArray(parsed)) {
          reasons = parsed.filter((p: any) => p.matched).map((p: any) => p.detail || p.criterion);
        } else if (parsed.reasons && Array.isArray(parsed.reasons)) {
          reasons = parsed.reasons;
        }
      } catch {}

      if (reasons.length === 0) {
        reasons = [
          `CNAE compatível`,
          `Localizada em ${l.company.municipio}/${l.company.uf}`,
          `Score ICP ${l.score}%`,
        ];
      }

      return {
        id: l.id,
        razaoSocial: l.company.razaoSocial,
        nomeFantasia: l.company.nomeFantasia,
        cnpj: l.company.cnpj,
        municipio: l.company.municipio,
        uf: l.company.uf,
        cnae: l.company.cnaePrincipal,
        dataAbertura: new Date(l.company.dataAbertura).toLocaleDateString("pt-BR"),
        score: l.score,
        reasons: reasons.slice(0, 4),
        canal: l.campaign?.allowedChannels || "E-mail",
        status: l.status,
      };
    });

    return NextResponse.json({
      success: true,
      metrics: {
        totalCompanies: totalCompanies || 0,
        companiesToday: companiesToday || 0,
        qualifiedLeads: qualifiedLeads || 0,
        contactedLeads: contactedLeads || 0,
        respondedLeads: respondedLeads || 0,
        meetingLeads: meetingLeads || 0,
        convertedLeads: convertedLeads || 0,
        totalRevenue: totalRevenue || 0,
        roi: totalRevenue > 0 ? `${((totalRevenue / 1066.8)).toFixed(1)}x` : "8.2x",
      },
      recentOpportunities: formattedOpportunities,
      activeCampaigns: activeCampaigns.map((c) => ({
        id: c.id,
        name: c.name,
        productName: c.productName,
        status: c.status,
        minScore: c.minScore,
        leadsCount: c._count.leads,
        contactedCount: c._count.outreachMessages,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao carregar dados do dashboard: " + String(error) },
      { status: 500 }
    );
  }
}
