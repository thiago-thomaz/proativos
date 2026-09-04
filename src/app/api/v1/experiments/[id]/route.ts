import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateExperimentWinner, recordVariantEvent } from "@/services/revenue/ab-testing";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:experiments:detail");

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    apiLogger.info("Avaliando vencedor do experimento", { id: params.id });
    const evaluation = await evaluateExperimentWinner(params.id);
    apiLogger.info("Avaliação de experimento concluída", { id: params.id, winner: evaluation.winner });
    return NextResponse.json({ success: true, ...evaluation });
  } catch (error: any) {
    apiLogger.error("Erro ao avaliar experimento", { error: error.message, stack: error.stack });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    apiLogger.info("Registrando evento em variante de experimento", { experimentId: params.id, variantId: body.variantId, event: body.event });
    const result = await recordVariantEvent(body.variantId, body.event);
    apiLogger.info("Evento de variante registrado com sucesso", { variantId: body.variantId, event: body.event });
    return NextResponse.json({ success: true, variant: result });
  } catch (error: any) {
    apiLogger.error("Erro ao registrar evento de variante", { error: error.message, stack: error.stack });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
