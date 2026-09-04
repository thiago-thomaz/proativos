import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { submitRefundRequest, processRefundDecision } from "@/services/revenue/refund-engine";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:marketplace:refunds");

export async function GET(req: NextRequest) {
  try {
    apiLogger.info("Listando solicitações de reembolso");
    const org = await prisma.organization.findFirst();
    if (!org) {
      apiLogger.warn("Organização não encontrada para listar reembolsos");
      return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });
    }

    const requests = await prisma.refundRequest.findMany({
      where: { organizationId: org.id },
      include: { leadOwnership: { include: { company: true } } },
      orderBy: { createdAt: "desc" },
    });

    apiLogger.info("Solicitações de reembolso recuperadas", { count: requests.length });
    return NextResponse.json({ success: true, count: requests.length, requests });
  } catch (error: any) {
    apiLogger.error("Erro ao listar reembolsos", { error: error.message, stack: error.stack });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    apiLogger.info("Processando ação de reembolso", { action: body.action, refundRequestId: body.refundRequestId });

    const org = await prisma.organization.findFirst();
    if (!org) {
      apiLogger.warn("Organização não encontrada para processar reembolso");
      return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });
    }

    if (body.action === "DECISION") {
      const result = await processRefundDecision({
        refundRequestId: body.refundRequestId,
        decision: body.decision,
        reviewerId: body.reviewerId || "SYSTEM_ADMIN",
        decisionNote: body.decisionNote,
      });
      apiLogger.info("Decisão de reembolso processada", { refundRequestId: body.refundRequestId, decision: body.decision });
      return NextResponse.json({ success: true, ...result });
    }

    const result = await submitRefundRequest({
      organizationId: org.id,
      leadOwnershipId: body.leadOwnershipId,
      reason: body.reason,
      evidence: body.evidence,
    });

    apiLogger.info("Solicitação de reembolso submetida", { id: result.id, organizationId: org.id });
    return NextResponse.json({ success: true, refundRequest: result });
  } catch (error: any) {
    apiLogger.error("Erro ao processar reembolso", { error: error.message, stack: error.stack });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
