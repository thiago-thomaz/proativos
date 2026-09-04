import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticatePublicApiRequest } from "@/services/revenue/public-api-guard";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:public:campaigns");

export async function GET(req: NextRequest) {
  const auth = await authenticatePublicApiRequest(req, "READ_CAMPAIGNS");
  if (!auth.valid) {
    apiLogger.warn("Falha na autenticação da API pública de listagem de campanhas", { error: auth.error });
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode || 401 });
  }

  apiLogger.info("Listando campanhas via API pública", { organizationId: auth.organizationId });

  const campaigns = await prisma.campaign.findMany({
    where: { organizationId: auth.organizationId },
    select: {
      id: true,
      name: true,
      productName: true,
      status: true,
      minScore: true,
      productPrice: true,
      createdAt: true,
    },
  });

  apiLogger.info("Campanhas listadas via API pública", { organizationId: auth.organizationId, count: campaigns.length });

  return NextResponse.json({ success: true, count: campaigns.length, data: campaigns });
}

export async function POST(req: NextRequest) {
  const auth = await authenticatePublicApiRequest(req, "WRITE_CAMPAIGNS");
  if (!auth.valid) {
    apiLogger.warn("Falha na autenticação da API pública de criação de campanhas", { error: auth.error });
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode || 401 });
  }

  try {
    const body = await req.json();
    apiLogger.info("Criando campanha via API pública", { organizationId: auth.organizationId, name: body.name, productName: body.productName });

    const campaign = await prisma.campaign.create({
      data: {
        organizationId: auth.organizationId!,
        name: body.name,
        productName: body.productName,
        status: body.status || "DRAFT",
        minScore: body.minScore || 70,
        productPrice: body.productPrice || 0,
        icpFilters: typeof body.icpFilters === "string" ? body.icpFilters : JSON.stringify(body.icpFilters || {}),
      },
    });

    apiLogger.info("Campanha criada via API pública", { id: campaign.id, name: campaign.name });

    return NextResponse.json({ success: true, data: campaign });
  } catch (error: any) {
    apiLogger.error("Erro ao criar campanha via API pública", { error: error.message, stack: error.stack });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
