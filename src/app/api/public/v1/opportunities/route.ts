import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticatePublicApiRequest } from "@/services/revenue/public-api-guard";

export async function GET(req: NextRequest) {
  const auth = await authenticatePublicApiRequest(req, "READ_OPPORTUNITIES");
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode || 401 });
  }

  const { searchParams } = new URL(req.url);
  const minScore = parseInt(searchParams.get("minScore") || "70", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

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

  return NextResponse.json({
    success: true,
    count: opportunities.length,
    data: opportunities,
  });
}
