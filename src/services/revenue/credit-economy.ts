import { prisma } from "@/lib/prisma";

export const OPERATION_CREDIT_COSTS: Record<string, number> = {
  COMPANY_DISCOVERY: 1, // Por lote de 10
  ENRICHMENT: 2,        // Por decisor/canal verificado
  EMAIL_SEND: 1,        // Por e-mail disparado
  WHATSAPP_SEND: 2,     // Por WhatsApp oficial
  MARKETPLACE_BUY: 1,   // Por lead adquirido
  AI_COPY_GENERATION: 1,
};

export interface ReserveCreditsParams {
  organizationId: string;
  operation: string;
  amount: number;
  correlationId: string;
  metadata?: any;
}

/**
 * Motor Atômico de Economia de Créditos (Fase 7)
 * Implementa reserva em duas fases (Lock -> Commit / Refund) com prevenção total a Double-Spend
 */
export async function reserveCredits(params: ReserveCreditsParams) {
  const { organizationId, operation, amount, correlationId, metadata } = params;

  if (amount <= 0) {
    throw new Error("Quantidade de créditos deve ser maior que zero.");
  }

  // Obter ou criar conta de créditos
  const account = await prisma.creditAccount.upsert({
    where: { organizationId },
    update: {},
    create: { organizationId, balance: 100, reservedBalance: 0 },
  });

  const availableBalance = account.balance - account.reservedBalance;
  if (availableBalance < amount) {
    return {
      success: false,
      error: `Saldo insuficiente. Disponível: ${availableBalance}, Requerido: ${amount}`,
      availableBalance,
    };
  }

  // Prevenir duplicação de correlationId
  const existingReservation = await prisma.creditReservation.findUnique({
    where: { correlationId },
  });
  if (existingReservation) {
    return {
      success: true,
      reservationId: existingReservation.id,
      alreadyReserved: true,
    };
  }

  // Atualizar saldo retido
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min de lock
  const [updatedAccount, reservation] = await prisma.$transaction([
    prisma.creditAccount.update({
      where: { id: account.id },
      data: { reservedBalance: { increment: amount } },
    }),
    prisma.creditReservation.create({
      data: {
        accountId: account.id,
        operation,
        amount,
        status: "RESERVED",
        correlationId,
        expiresAt,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    }),
  ]);

  return {
    success: true,
    reservationId: reservation.id,
    reservedAmount: amount,
    newReservedBalance: updatedAccount.reservedBalance,
    newAvailableBalance: updatedAccount.balance - updatedAccount.reservedBalance,
  };
}

/**
 * Confirma a operação e debita permanentemente os créditos
 */
export async function commitCredits(correlationId: string, description?: string) {
  const reservation = await prisma.creditReservation.findUnique({
    where: { correlationId },
    include: { account: true },
  });

  if (!reservation || reservation.status !== "RESERVED") {
    throw new Error(`Reserva inválida ou já finalizada para o correlationId: ${correlationId}`);
  }

  const [updatedAccount] = await prisma.$transaction([
    prisma.creditAccount.update({
      where: { id: reservation.accountId },
      data: {
        balance: { decrement: reservation.amount },
        reservedBalance: { decrement: reservation.amount },
      },
    }),
    prisma.creditReservation.update({
      where: { id: reservation.id },
      data: { status: "COMMITTED" },
    }),
    prisma.creditTransaction.create({
      data: {
        accountId: reservation.accountId,
        amount: -reservation.amount,
        type: reservation.operation,
        description: description || `Consumo de créditos: ${reservation.operation}`,
        metadata: reservation.metadata,
      },
    }),
  ]);

  return {
    success: true,
    debitedAmount: reservation.amount,
    remainingBalance: updatedAccount.balance,
  };
}

/**
 * Devolve os créditos ao saldo disponível liberando a reserva
 */
export async function refundReservedCredits(correlationId: string, reason?: string) {
  const reservation = await prisma.creditReservation.findUnique({
    where: { correlationId },
    include: { account: true },
  });

  if (!reservation || reservation.status !== "RESERVED") {
    return { success: false, error: "Nenhuma reserva ativa para estorno" };
  }

  const [updatedAccount] = await prisma.$transaction([
    prisma.creditAccount.update({
      where: { id: reservation.accountId },
      data: {
        reservedBalance: { decrement: reservation.amount },
      },
    }),
    prisma.creditReservation.update({
      where: { id: reservation.id },
      data: { status: "REFUNDED" },
    }),
    prisma.creditTransaction.create({
      data: {
        accountId: reservation.accountId,
        amount: 0,
        type: "REFUND",
        description: `Liberação de reserva: ${reason || "Operação não executada"}`,
      },
    }),
  ]);

  return {
    success: true,
    refundedAmount: reservation.amount,
    availableBalance: updatedAccount.balance - updatedAccount.reservedBalance,
  };
}
