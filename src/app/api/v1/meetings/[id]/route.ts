import { NextRequest, NextResponse } from "next/server";
import { updateMeetingStatus } from "@/services/revenue/meeting-engine";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:meetings:detail");

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    apiLogger.info("Atualizando status da reunião", { id: params.id, status: body.status });

    const updated = await updateMeetingStatus(params.id, body.status, body.notes);
    apiLogger.info("Status da reunião atualizado", { id: params.id, newStatus: updated.status });
    return NextResponse.json({ success: true, meeting: updated });
  } catch (error: any) {
    apiLogger.error("Erro ao atualizar reunião", { error: error.message, stack: error.stack });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
