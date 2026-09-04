import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateDealStage } from "@/services/revenue/crm-engine";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:crm:deals:detail");

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    apiLogger.info("Buscando detalhes do deal", { id: params.id });
    const deal = await prisma.deal.findUnique({
      where: { id: params.id },
      include: {
        company: { include: { contacts: true } },
        owner: true,
        lead: { include: { outreachMessages: true } },
        events: { orderBy: { createdAt: "desc" } },
        meetings: true,
        attributions: true,
      },
    });

    if (!deal) {
      apiLogger.warn("Deal não encontrado", { id: params.id });
      return NextResponse.json({ error: "Deal não encontrado" }, { status: 404 });
    }

    apiLogger.info("Detalhes do deal recuperados", { id: params.id, stage: deal.stage });
    return NextResponse.json({ success: true, deal });
  } catch (error: any) {
    apiLogger.error("Erro ao buscar deal", { error: error.message, stack: error.stack });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    apiLogger.info("Atualizando estágio do deal", { id: params.id, toStage: body.stage, actualValue: body.actualValue });

    const updated = await updateDealStage({
      dealId: params.id,
      toStage: body.stage,
      actualValue: body.actualValue,
      lostReason: body.lostReason,
      note: body.note,
      actorId: body.actorId,
    });

    apiLogger.info("Estágio do deal atualizado", { id: params.id, newStage: updated.stage });
    return NextResponse.json({ success: true, deal: updated });
  } catch (error: any) {
    apiLogger.error("Erro ao atualizar estágio do deal", { error: error.message, stack: error.stack });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
