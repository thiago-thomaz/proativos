import { prisma } from "@/lib/prisma";

export interface PushToDlqParams {
  queueType: "DISCOVERY" | "INGESTION" | "ENRICHMENT" | "OUTREACH" | "INBOUND" | "WEBHOOK";
  payload: any;
  errorMessage: string;
  errorStack?: string;
  provider?: string;
  organizationId?: string;
  campaignId?: string;
  executionId?: string;
  correlationId?: string;
  maxRetries?: number;
}

/**
 * Motor de Dead Letter Queue (DLQ) - Fase 6
 */
export async function pushToDeadLetterQueue(params: PushToDlqParams) {
  const serializedPayload =
    typeof params.payload === "string" ? params.payload : JSON.stringify(params.payload);

  const dlqRecord = await prisma.deadLetterMessage.create({
    data: {
      queueType: params.queueType,
      payload: serializedPayload,
      errorMessage: params.errorMessage,
      errorStack: params.errorStack || null,
      provider: params.provider || null,
      organizationId: params.organizationId || null,
      campaignId: params.campaignId || null,
      executionId: params.executionId || null,
      correlationId: params.correlationId || null,
      maxRetries: params.maxRetries || 3,
      status: "PENDING",
    },
  });

  return dlqRecord;
}

/**
 * Consulta Mensagens na Dead Letter Queue
 */
export async function getDeadLetterMessages(filters: {
  queueType?: string;
  status?: string;
  organizationId?: string;
  limit?: number;
} = {}) {
  return prisma.deadLetterMessage.findMany({
    where: {
      ...(filters.queueType ? { queueType: filters.queueType } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.organizationId ? { organizationId: filters.organizationId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: filters.limit || 50,
  });
}

/**
 * Reprocessa / Retenta uma mensagem da DLQ
 */
export async function retryDeadLetterMessage(id: string) {
  const msg = await prisma.deadLetterMessage.findUnique({
    where: { id },
  });

  if (!msg) {
    throw new Error(`Mensagem DLQ '${id}' não encontrada.`);
  }

  const nextRetryCount = msg.retryCount + 1;
  const isExhausted = nextRetryCount >= msg.maxRetries;

  const updated = await prisma.deadLetterMessage.update({
    where: { id },
    data: {
      retryCount: nextRetryCount,
      status: isExhausted ? "FAILED" : "RETRYING",
      lastTriedAt: new Date(),
    },
  });

  return {
    success: true,
    message: updated,
    isExhausted,
  };
}

/**
 * Marca uma mensagem da DLQ como resolvida
 */
export async function resolveDeadLetterMessage(id: string, notes?: string) {
  return prisma.deadLetterMessage.update({
    where: { id },
    data: {
      status: "RESOLVED",
      errorMessage: notes ? `${notes} (Resolvido manualmente)` : undefined,
    },
  });
}

/**
 * Marca uma mensagem da DLQ como ignorada
 */
export async function ignoreDeadLetterMessage(id: string) {
  return prisma.deadLetterMessage.update({
    where: { id },
    data: { status: "IGNORED" },
  });
}
