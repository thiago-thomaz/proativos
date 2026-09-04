import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buyMarketplacePackage } from "@/services/revenue/marketplace-engine";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:marketplace:buy");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    apiLogger.info("Processando compra de pacote no marketplace", { packageId: body.packageId, campaignId: body.campaignId });
    const org = await prisma.organization.findFirst();
    if (!org) {
      apiLogger.warn("Organização não encontrada para compra no marketplace");
      return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });
    }

    const result = await buyMarketplacePackage({
      organizationId: org.id,
      packageId: body.packageId,
      campaignId: body.campaignId,
    });

    apiLogger.info("Compra no marketplace processada", { orgId: org.id, result });
    return NextResponse.json(result);
  } catch (error: any) {
    apiLogger.error("Erro na compra do pacote marketplace", { error: error.message, stack: error.stack });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
