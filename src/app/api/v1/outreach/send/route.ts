import { NextRequest, NextResponse } from "next/server";
import { sendOutreachMessage } from "@/services/outreach-engine";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:outreach:send");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      leadId,
      campaignId,
      forceChannel,
      customBody,
      customSubject,
      idempotencyKey,
      simulationMode,
      ignoreBusinessHoursForTesting,
    } = body;
    apiLogger.info("Requisição de disparo de outreach", {
      leadId,
      campaignId,
      forceChannel,
      simulationMode,
      idempotencyKey,
    });

    if (!leadId || !campaignId) {
      apiLogger.warn("Parâmetros leadId ou campaignId ausentes", { leadId, campaignId });
      return NextResponse.json(
        { error: "Parâmetros 'leadId' e 'campaignId' são obrigatórios." },
        { status: 400 }
      );
    }

    const result = await sendOutreachMessage(leadId, campaignId, {
      forceChannel,
      customBody,
      customSubject,
      idempotencyKey,
      simulationMode,
      ignoreBusinessHoursForTesting,
    });

    apiLogger.info("Disparo de outreach processado", { leadId, campaignId, success: result.success });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    apiLogger.error("Falha ao processar envio de outreach", { error: error.message, stack: error.stack });
    return NextResponse.json(
      { error: "Falha ao processar envio de outreach", detail: error.message },
      { status: 400 }
    );
  }
}
