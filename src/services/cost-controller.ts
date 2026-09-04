import { prisma } from "@/lib/prisma";
import { AppLogger } from "@/lib/logger";

const costLogger = new AppLogger("cost-controller");

export interface ProviderCostMatrix {
  companyDiscovery: number;
  emailEnrichment: number;
  phoneEnrichment: number;
  whatsappVerification: number;
  emailSend: number;
  whatsappSend: number;
}

export const DEFAULT_PROVIDER_COSTS: ProviderCostMatrix = {
  companyDiscovery: 0.0,
  emailEnrichment: 0.02,
  phoneEnrichment: 0.05,
  whatsappVerification: 0.01,
  emailSend: 0.01,
  whatsappSend: 0.05,
};

/**
 * Motor de Controle de Custos e Reserva de Créditos em Duas Fases (Fase 6)
 */
export async function estimateOperationCost(
  operationType: keyof ProviderCostMatrix,
  itemCount: number = 1
): Promise<{ estimatedCostUSD: number; requiredCredits: number }> {
  const unitCost = DEFAULT_PROVIDER_COSTS[operationType] || 0.01;
  const totalCost = unitCost * itemCount;
  // 1 crédito por operação base
  const requiredCredits = Math.max(1, itemCount);

  return {
    estimatedCostUSD: totalCost,
    requiredCredits,
  };
}

/**
 * Fase 1: Reserva Atômica de Créditos (Lock de Saldo)
 */
export async function reserveCredits(
  organizationId: string,
  amount: number,
  description: string
): Promise<{ success: boolean; reservationId: string; remainingBalance: number }> {
  const account = await prisma.creditAccount.findUnique({
    where: { organizationId },
  });

  if (!account || account.balance < amount) {
    costLogger.warn("INSUFFICIENT_CREDITS", {
      organizationId,
      available: account?.balance || 0,
      required: amount,
    }, { organizationId });
    throw new Error(
      `Saldo de créditos insuficiente. Disponível: ${account?.balance || 0} | Necessário: ${amount}.`
    );
  }

  // Deduz do saldo disponível e move para o saldo retido/reservado
  const updated = await prisma.creditAccount.update({
    where: { id: account.id },
    data: {
      balance: { decrement: amount },
      reservedBalance: { increment: amount },
    },
  });

  const tx = await prisma.creditTransaction.create({
    data: {
      accountId: account.id,
      amount: -amount,
      type: "RESERVATION",
      description: `[RESERVA] ${description}`,
    },
  });

  costLogger.info("CREDITS_RESERVED", {
    organizationId,
    amount,
    reservationId: tx.id,
    remainingBalance: updated.balance,
  }, { organizationId });

  return {
    success: true,
    reservationId: tx.id,
    remainingBalance: updated.balance,
  };
}

/**
 * Fase 2A: Confirmação da Reserva (Operação Concluída com Sucesso)
 */
export async function commitReservation(
  organizationId: string,
  amount: number
): Promise<{ success: boolean }> {
  const account = await prisma.creditAccount.findUnique({
    where: { organizationId },
  });

  if (!account) {
    throw new Error("Conta de créditos não encontrada.");
  }

  // Libera a retenção do saldo reservado
  await prisma.creditAccount.update({
    where: { id: account.id },
    data: {
      reservedBalance: { decrement: Math.min(account.reservedBalance, amount) },
    },
  });

  costLogger.info("RESERVATION_COMMITTED", {
    organizationId,
    amount,
  }, { organizationId });

  return { success: true };
}

/**
 * Fase 2B: Reembolso da Reserva (Operação Falhou ou foi Abortada)
 */
export async function refundReservation(
  organizationId: string,
  amount: number,
  reason: string
): Promise<{ success: boolean; newBalance: number }> {
  const account = await prisma.creditAccount.findUnique({
    where: { organizationId },
  });

  if (!account) {
    throw new Error("Conta de créditos não encontrada.");
  }

  // Devolve saldo reservado para o saldo disponível
  const updated = await prisma.creditAccount.update({
    where: { id: account.id },
    data: {
      balance: { increment: amount },
      reservedBalance: { decrement: Math.min(account.reservedBalance, amount) },
    },
  });

  await prisma.creditTransaction.create({
    data: {
      accountId: account.id,
      amount: amount,
      type: "REFUND",
      description: `[REEMBOLSO] ${reason}`,
    },
  });

  costLogger.info("RESERVATION_REFUNDED", {
    organizationId,
    amount,
    reason,
    newBalance: updated.balance,
  }, { organizationId });

  return {
    success: true,
    newBalance: updated.balance,
  };
}
