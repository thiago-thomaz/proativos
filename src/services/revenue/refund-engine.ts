import { prisma } from "@/lib/prisma";
import { RefundReason } from "@/lib/types";

export interface RequestRefundInput {
  organizationId: string;
  leadOwnershipId: string;
  reason: RefundReason;
  evidence?: string;
}

/**
 * Motor de Solicitação e Processamento de Estornos de Leads (Fase 7)
 * Permite que clientes solicitem reembolso de créditos para leads com inconsistências objetivas
 */
export async function submitRefundRequest(input: RequestRefundInput) {
  const ownership = await prisma.leadOwnership.findUnique({
    where: { id: input.leadOwnershipId },
    include: { company: true },
  });

  if (!ownership || ownership.organizationId !== input.organizationId) {
    throw new Error("Posse do lead não encontrada ou não pertence à organização.");
  }

  if (ownership.status === "REFUNDED") {
    throw new Error("Este lead já foi estornado anteriormente.");
  }

  // Prevenir solicitações duplicadas pendentes
  const existingPending = await prisma.refundRequest.findFirst({
    where: { leadOwnershipId: input.leadOwnershipId, status: "PENDING" },
  });
  if (existingPending) {
    return existingPending;
  }

  const req = await prisma.refundRequest.create({
    data: {
      organizationId: input.organizationId,
      leadOwnershipId: ownership.id,
      leadId: ownership.leadId,
      reason: input.reason,
      evidence: input.evidence || "Solicitado via painel do cliente",
      status: "PENDING",
      creditsRefunded: ownership.creditsPaid,
    },
  });

  return req;
}

/**
 * Processa a decisão de um estorno (Aprovar ou Rejeitar) com restauração de créditos
 */
export async function processRefundDecision(params: {
  refundRequestId: string;
  decision: "APPROVE" | "REJECT";
  reviewerId: string;
  decisionNote?: string;
}) {
  const { refundRequestId, decision, reviewerId, decisionNote } = params;

  const req = await prisma.refundRequest.findUnique({
    where: { id: refundRequestId },
    include: { leadOwnership: true },
  });

  if (!req || req.status !== "PENDING") {
    throw new Error("Solicitação de estorno inválida ou já finalizada.");
  }

  if (decision === "APPROVE") {
    // 1. Marcar solicitação como aprovada
    const updatedReq = await prisma.refundRequest.update({
      where: { id: req.id },
      data: {
        status: "APPROVED",
        reviewerId,
        decisionNote: decisionNote || "Aprovado conforme política de qualidade",
      },
    });

    // 2. Atualizar status da posse para REFUNDED
    await prisma.leadOwnership.update({
      where: { id: req.leadOwnershipId },
      data: { status: "REFUNDED" },
    });

    // 3. Devolver créditos para a conta da organização
    const account = await prisma.creditAccount.upsert({
      where: { organizationId: req.organizationId },
      update: { balance: { increment: req.creditsRefunded } },
      create: { organizationId: req.organizationId, balance: req.creditsRefunded },
    });

    await prisma.creditTransaction.create({
      data: {
        accountId: account.id,
        amount: req.creditsRefunded,
        type: "REFUND",
        description: `Estorno aprovado para lead (${req.reason})`,
      },
    });

    return {
      status: "APPROVED",
      refundRequestId: req.id,
      creditsRestored: req.creditsRefunded,
      newBalance: account.balance,
    };
  } else {
    // Rejeição
    await prisma.refundRequest.update({
      where: { id: req.id },
      data: {
        status: "REJECTED",
        reviewerId,
        decisionNote: decisionNote || "Rejeitado: evidências insuficientes",
      },
    });

    return {
      status: "REJECTED",
      refundRequestId: req.id,
      creditsRestored: 0,
    };
  }
}
