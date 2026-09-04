import { prisma } from "@/lib/prisma";
import { ExperimentType } from "@/lib/types";
import { AppLogger } from "@/lib/logger";

const abLogger = new AppLogger("ab-testing");

export interface CreateExperimentInput {
  organizationId: string;
  campaignId: string;
  name: string;
  type: ExperimentType;
  minSampleSize?: number;
  variants: {
    name: string;
    payload: any;
  }[];
}

/**
 * Motor de Testes A/B (Fase 7)
 * Permite criar experimentos e testar copys, assuntos e canais de forma controlada
 */
export async function createAbExperiment(input: CreateExperimentInput) {
  if (input.variants.length < 2) {
    throw new Error("Um experimento A/B requer no mínimo 2 variantes.");
  }

  const experiment = await prisma.abExperiment.create({
    data: {
      organizationId: input.organizationId,
      campaignId: input.campaignId,
      name: input.name,
      type: input.type,
      status: "RUNNING",
      minSampleSize: input.minSampleSize || 100,
      variants: {
        create: input.variants.map((v) => ({
          name: v.name,
          payload: JSON.stringify(v.payload),
        })),
      },
    },
    include: { variants: true },
  });

  abLogger.info("AB_EXPERIMENT_CREATED", {
    experimentId: experiment.id,
    campaignId: input.campaignId,
    type: input.type,
    variantsCount: input.variants.length,
  }, { organizationId: input.organizationId });

  return experiment;
}

/**
 * Seleciona a próxima variante para envio com balanceamento de impressões
 */
export async function getNextVariantForExecution(experimentId: string) {
  const variants = await prisma.abVariant.findMany({
    where: { experimentId },
    orderBy: { impressions: "asc" },
  });

  if (variants.length === 0) return null;

  const chosen = variants[0];
  await prisma.abVariant.update({
    where: { id: chosen.id },
    data: { impressions: { increment: 1 } },
  });

  return {
    ...chosen,
    payload: JSON.parse(chosen.payload),
  };
}

/**
 * Registra conversão ou engajamento de uma variante
 */
export async function recordVariantEvent(
  variantId: string,
  event: "DELIVERED" | "RESPONSE" | "POSITIVE_RESPONSE" | "MEETING" | "CONVERSION"
) {
  const updateData: any = {};
  if (event === "DELIVERED") updateData.delivered = { increment: 1 };
  if (event === "RESPONSE") updateData.responses = { increment: 1 };
  if (event === "POSITIVE_RESPONSE") updateData.positiveResponses = { increment: 1 };
  if (event === "MEETING") updateData.meetings = { increment: 1 };
  if (event === "CONVERSION") updateData.conversions = { increment: 1 };

  return prisma.abVariant.update({
    where: { id: variantId },
    data: updateData,
  });
}

/**
 * Avalia significância estatística e declara vencedor se amostra mínima for atingida
 */
export async function evaluateExperimentWinner(experimentId: string) {
  const experiment = await prisma.abExperiment.findUnique({
    where: { id: experimentId },
    include: { variants: true },
  });

  if (!experiment) throw new Error("Experimento não encontrado.");

  const totalImpressions = experiment.variants.reduce((acc, v) => acc + v.impressions, 0);
  if (totalImpressions < experiment.minSampleSize) {
    return {
      status: "INCONCLUSIVE",
      reason: `Amostra insuficiente (${totalImpressions}/${experiment.minSampleSize})`,
      variants: experiment.variants,
    };
  }

  // Ordenar por taxa de resposta positiva
  const ranked = experiment.variants.map((v) => {
    const rate = v.delivered > 0 ? (v.positiveResponses / v.delivered) * 100 : 0;
    return { ...v, conversionRate: rate };
  }).sort((a, b) => b.conversionRate - a.conversionRate);

  const best = ranked[0];
  const secondBest = ranked[1];

  // Diferença relativa de conversão
  const diff = best.conversionRate - (secondBest?.conversionRate || 0);

  if (diff >= 5.0 && best.delivered >= 30) {
    await prisma.abExperiment.update({
      where: { id: experimentId },
      data: {
        status: "COMPLETED",
        winnerVariantId: best.id,
      },
    });

    abLogger.info("AB_EXPERIMENT_WINNER_DECLARED", {
      experimentId,
      winnerVariantId: best.id,
      winnerName: best.name,
      differencePercentage: diff,
    }, { organizationId: experiment.organizationId });

    return {
      status: "WINNER_DECLARED",
      winner: best,
      differencePercentage: diff,
      variants: ranked,
    };
  }

  return {
    status: "RUNNING",
    reason: "Sem diferença estatisticamente significante ainda.",
    variants: ranked,
  };
}
