import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticatePublicApiRequest } from "@/services/revenue/public-api-guard";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:public:opportunities");

export async function GET(req: NextRequest) {
  const auth = await authenticatePublicApiRequest(req, "READ_OPPORTUNITIES");
  if (!auth.valid) {
    apiLogger.warn("Falha na autenticação da API pública de oportunidades", { error: auth.error });
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode || 401 });
  }

  const { searchParams } = new URL(req.url);
  const minScore = parseInt(searchParams.get("minScore") || "70", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  apiLogger.info("Buscando oportunidades via API pública", { organizationId: auth.organizationId, minScore, limit });

  const opportunities = await prisma.opportunityScore.findMany({
    where: {
      organizationId: auth.organizationId,
      opportunityScore: { gte: minScore },
    },
    include: {
      company: {
        select: {
          cnpj: true,
          razaoSocial: true,
          nomeFantasia: true,
          cnaePrincipal: true,
          uf: true,
          municipio: true,
          porte: true,
          capitalSocial: true,
          dataAbertura: true,
        },
      },
    },
    orderBy: { opportunityScore: "desc" },
    take: limit,
  });

  apiLogger.info("Oportunidades retornadas via API pública", { organizationId: auth.organizationId, count: opportunities.length });

  return NextResponse.json({
    success: true,
    count: opportunities.length,
    data: opportunities,
  });
}
