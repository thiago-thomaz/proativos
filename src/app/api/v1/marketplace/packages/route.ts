import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createMarketplacePackage } from "@/services/revenue/marketplace-engine";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:marketplace:packages");

export async function GET(req: NextRequest) {
  try {
    apiLogger.info("Listando pacotes ativos do marketplace");
    const packages = await prisma.marketplacePackage.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
    });

    apiLogger.info("Pacotes do marketplace recuperados", { count: packages.length });
    return NextResponse.json({ success: true, count: packages.length, packages });
  } catch (error: any) {
    apiLogger.error("Erro ao listar pacotes do marketplace", { error: error.message, stack: error.stack });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    apiLogger.info("Criando novo pacote no marketplace", { name: body.name, priceCredits: body.priceCredits });
    const pkg = await createMarketplacePackage(body);
    apiLogger.info("Pacote criado com sucesso", { id: pkg.id });
    return NextResponse.json({ success: true, package: pkg });
  } catch (error: any) {
    apiLogger.error("Erro ao criar pacote no marketplace", { error: error.message, stack: error.stack });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
