import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAbExperiment } from "@/services/revenue/ab-testing";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:experiments");

export async function GET(req: NextRequest) {
  try {
    apiLogger.info("Listando experimentos A/B");
    const org = await prisma.organization.findFirst();
    if (!org) {
      apiLogger.warn("Organização não encontrada para listar experimentos");
      return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });
    }

    const experiments = await prisma.abExperiment.findMany({
      where: { organizationId: org.id },
      include: { variants: true, campaign: true },
      orderBy: { createdAt: "desc" },
    });

    apiLogger.info("Experimentos listados com sucesso", { count: experiments.length });
    return NextResponse.json({ success: true, count: experiments.length, experiments });
  } catch (error: any) {
    apiLogger.error("Erro ao listar experimentos", { error: error.message, stack: error.stack });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    apiLogger.info("Criando novo experimento A/B", { name: body.name, type: body.type, campaignId: body.campaignId });
    const org = await prisma.organization.findFirst();
    if (!org) {
      apiLogger.warn("Organização não encontrada para criar experimento");
      return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });
    }

    const experiment = await createAbExperiment({
      organizationId: org.id,
      campaignId: body.campaignId,
      name: body.name,
      type: body.type,
      minSampleSize: body.minSampleSize,
      variants: body.variants,
    });

    apiLogger.info("Experimento A/B criado com sucesso", { id: experiment.id, name: experiment.name });
    return NextResponse.json({ success: true, experiment });
  } catch (error: any) {
    apiLogger.error("Erro ao criar experimento", { error: error.message, stack: error.stack });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
