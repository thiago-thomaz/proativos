import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateCompanyAgainstICP } from "@/services/icp-engine";
import { assessICPQuality } from "@/services/icp-quality";
import { ICPStructuredDefinition, ICPFilterConfig } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const icp = (body.icp || body) as ICPStructuredDefinition | ICPFilterConfig;

    // Buscar todas as empresas cadastradas
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

    const evaluatedSamples: any[] = [];

    for (const company of companies) {
      const result = evaluateCompanyAgainstICP(
        {
          cnpj: company.cnpj,
          razaoSocial: company.razaoSocial,
          nomeFantasia: company.nomeFantasia,
          dataAbertura: company.dataAbertura,
          situacao: company.situacao,
          cnaePrincipal: company.cnaePrincipal,
          cnaesSecundarios: company.cnaesSecundarios,
          municipio: company.municipio,
          uf: company.uf,
          porte: company.porte,
          capitalSocial: company.capitalSocial,
          telefone: company.telefone,
          email: company.email,
        },
        icp,
        now
      );

      if (result.matched) {
        matchesCount++;
      } else {
        rejectsCount++;
      }

      // Distribuição de score
      if (result.score >= 90) distribution["90-100"]++;
      else if (result.score >= 80) distribution["80-89"]++;
      else if (result.score >= 70) distribution["70-79"]++;
      else if (result.score >= 60) distribution["60-69"]++;
      else distribution["<60"]++;

      if (evaluatedSamples.length < 10) {
        evaluatedSamples.push({
          cnpj: company.cnpj,
          razaoSocial: company.razaoSocial,
          municipio: company.municipio,
          uf: company.uf,
          cnae: company.cnaePrincipal,
          dataAbertura: company.dataAbertura,
          score: result.score,
          matched: result.matched,
          reasons: result.reasons,
          rejections: result.rejections,
        });
      }
    }

    const quality = assessICPQuality(companies.length, matchesCount, distribution);

    return NextResponse.json({
      success: true,
      totalUniverse: companies.length,
      matchedCount: matchesCount,
      rejectedCount: rejectsCount,
      distribution,
      quality,
      sampleLeads: evaluatedSamples,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Falha ao testar ICP", details: String(error) },
      { status: 500 }
    );
  }
}
