import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNextCadenceStep } from "@/services/cadence-engine";
import { sendOutreachMessage } from "@/services/outreach-engine";
import { validateN8nRequest } from "@/services/n8n-security";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:cadence:process");

export async function POST(req: NextRequest) {
  try {
    const apiKeyHeader = req.headers.get("x-api-key") || req.headers.get("authorization");
    const signatureHeader = req.headers.get("x-signature-sha256");
    const timestampHeader = req.headers.get("x-timestamp");
    const requestIdHeader = req.headers.get("x-request-id");

    const rawText = await req.text();
    let body: any = {};
    if (rawText) {
      try {
        body = JSON.parse(rawText);
      } catch {}
    }

    apiLogger.info("Processando lote de cadências", {
      campaignId: body.campaignId,
      organizationId: body.organizationId,
      limit: body.limit,
      simulationMode: body.simulationMode,
    });

    if (apiKeyHeader) {
      const authResult = await validateN8nRequest({
        apiKeyHeader,
        signatureHeader,
        timestampHeader,
        requestIdHeader,
        rawPayload: rawText,
        requiredPermission: "OUTREACH",
      });

      if (!authResult.valid) {
        apiLogger.warn("Falha na autenticação N8N para processamento de cadência", { error: authResult.errorMessage });
        return NextResponse.json(
          { error: "Acesso não autorizado", detail: authResult.errorMessage },
          { status: 401 }
        );
      }
    }

    const { campaignId, organizationId, limit = 20, simulationMode = false } = body;

    // Buscar leads que estão em andamento ou qualificados para início de cadência
    const leads = await prisma.lead.findMany({
      where: {
        status: { in: ["QUALIFIED", "CONTACTED", "READY_TO_CONTACT"] },
        cadenceStatus: { in: ["NOT_STARTED", "IN_PROGRESS"] },
        ...(campaignId ? { campaignId } : {}),
        ...(organizationId ? { organizationId } : {}),
      },
      take: limit,
      include: {
        campaign: true,
      },
    });

    const results = [];

    for (const lead of leads) {
      const cadenceCheck = await getNextCadenceStep(lead.id);

      if (cadenceCheck.shouldSend && cadenceCheck.step) {
        try {
          const dispatch = await sendOutreachMessage(lead.id, lead.campaignId, {
            forceChannel: cadenceCheck.step.channel,
            customBody: cadenceCheck.step.body,
            customSubject: cadenceCheck.step.subject,
            simulationMode,
            idempotencyKey: `cadence-${lead.id}-step${cadenceCheck.step.stepOrder}-${new Date().toISOString().slice(0, 10)}`,
          });

          results.push({
            leadId: lead.id,
            status: "SENT",
            step: cadenceCheck.step.stepOrder,
            dispatch,
          });
        } catch (err: any) {
          apiLogger.warn("Erro ao disparar mensagem de cadência para lead", { leadId: lead.id, error: err.message });
          results.push({
            leadId: lead.id,
            status: "BLOCKED",
            step: cadenceCheck.step.stepOrder,
            reason: err.message,
          });
        }
      } else {
        results.push({
          leadId: lead.id,
          status: "SKIPPED",
          reason: cadenceCheck.reason,
        });
      }
    }

    const sentCount = results.filter((r) => r.status === "SENT").length;
    apiLogger.info("Lote de cadências finalizado", {
      processed: leads.length,
      dispatched: sentCount,
    });

    return NextResponse.json({
      success: true,
      processed: leads.length,
      dispatched: sentCount,
      results,
    });
  } catch (error: any) {
    apiLogger.error("Falha ao processar lote de cadências", { error: error.message, stack: error.stack });
    return NextResponse.json(
      { error: "Falha ao processar lote de cadências", detail: error.message },
      { status: 500 }
    );
  }
}
