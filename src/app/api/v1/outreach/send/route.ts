import { NextRequest, NextResponse } from "next/server";
import { sendOutreachMessage } from "@/services/outreach-engine";

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

    if (!leadId || !campaignId) {
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

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Falha ao processar envio de outreach", detail: error.message },
      { status: 400 }
    );
  }
}
