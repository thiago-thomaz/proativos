import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateCompanyAgainstICP } from "@/services/icp-engine";
import { assessICPQuality } from "@/services/icp-quality";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: params.id },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 });
    }

    let icp: any = {};
    try {
      icp = JSON.parse(campaign.icpFilters);
    } catch {}

    const companies = await prisma.company.findMany({
      take: 500,
      orderBy: { dataAbertura: "desc" },
    });

    const now = new Date();
    let matchesCount = 0;
    let rejectsCount = 0;

    const distribution = {
      "90-100": 0,
      "80-89": 0,
      "70-79": 0,
      "60-69": 0,
      "<60": 0,
    };

    const samples: any[] = [];

    for (const comp of companies) {
      const evalResult = evaluateCompanyAgainstICP(
        {
          cnpj: comp.cnpj,
          razaoSocial: comp.razaoSocial,
          nomeFantasia: comp.nomeFantasia,
          dataAbertura: comp.dataAbertura,
          situacao: comp.situacao,
          cnaePrincipal: comp.cnaePrincipal,
          cnaesSecundarios: comp.cnaesSecundarios,
          municipio: comp.municipio,
          uf: comp.uf,
          porte: comp.porte,
          capitalSocial: comp.capitalSocial,
          telefone: comp.telefone,
          email: comp.email,
        },
        icp,
        now
      );

      if (evalResult.matched) matchesCount++;
      else rejectsCount++;

      if (evalResult.score >= 90) distribution["90-100"]++;
      else if (evalResult.score >= 80) distribution["80-89"]++;
      else if (evalResult.score >= 70) distribution["70-79"]++;
      else if (evalResult.score >= 60) distribution["60-69"]++;
      else distribution["<60"]++;

      if (samples.length < 10) {
        samples.push({
          cnpj: comp.cnpj,
          razaoSocial: comp.razaoSocial,
          municipio: comp.municipio,
          uf: comp.uf,
          cnae: comp.cnaePrincipal,
          dataAbertura: comp.dataAbertura,
          score: evalResult.score,
          matched: evalResult.matched,
          reasons: evalResult.reasons,
          rejections: evalResult.rejections,
        });
      }
    }

    const quality = assessICPQuality(companies.length, matchesCount, distribution);

    return NextResponse.json({
      success: true,
      campaignId: campaign.id,
      campaignName: campaign.name,
      totalUniverse: companies.length,
      matchedCount: matchesCount,
      rejectedCount: rejectsCount,
      distribution,
      quality,
      sampleLeads: samples,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Falha ao gerar preview da campanha", details: String(error) },
      { status: 500 }
    );
  }
}
