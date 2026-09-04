import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticatePublicApiRequest } from "@/services/revenue/public-api-guard";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:public:leads");

export async function GET(req: NextRequest) {
  const auth = await authenticatePublicApiRequest(req, "READ_LEADS");
  if (!auth.valid) {
    apiLogger.warn("Falha na autenticação da API pública de leads", { error: auth.error });
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode || 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  apiLogger.info("Buscando leads via API pública", { organizationId: auth.organizationId, status, limit });

  const leads = await prisma.lead.findMany({
    where: {
      organizationId: auth.organizationId,
      ...(status ? { status } : {}),
    },
    include: {
      company: true,
      campaign: { select: { id: true, name: true } },
    },
    orderBy: { score: "desc" },
    take: limit,
  });

  apiLogger.info("Leads retornados via API pública", { organizationId: auth.organizationId, count: leads.length });

  return NextResponse.json({
    success: true,
    count: leads.length,
    data: leads,
  });
}
