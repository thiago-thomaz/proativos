import { prisma } from "@/lib/prisma";
import { CadenceStepConfig } from "@/lib/types";
import { AppLogger } from "@/lib/logger";

const cadenceLogger = new AppLogger("cadence");

export const DEFAULT_CADENCE_STEPS: CadenceStepConfig[] = [
  {
    stepOrder: 1,
    channel: "WHATSAPP",
    subject: "Apresentação de Parceria Comercial",
    body: "Olá, {{contact_name}}! Parabéns pela abertura da {{company_name}} em {{city}}. Temos soluções sob medida para {{cnae}}. {{cta}}",
    delayDays: 0,
  },
  {
    stepOrder: 2,
    channel: "EMAIL",
    subject: "Acompanhamento: Soluções para {{company_name}}",
    body: "Olá, {{contact_name}}! Passando para checar se você conseguiu avaliar nossa mensagem anterior. {{cta}}",
    delayDays: 2,
  },
  {
    stepOrder: 3,
    channel: "EMAIL",
    subject: "Última tentativa de contato - {{company_name}}",
    body: "Olá, {{contact_name}}! Não quero incomodar. Caso ainda tenha interesse em conhecer nosso {{product_name}}, estamos à disposição!",
    delayDays: 5,
  },
];

/**
 * Motor de Cadências e Avaliação de Stop Conditions (Fase 5)
 */
export async function getNextCadenceStep(
  leadId: string
): Promise<{
  shouldSend: boolean;
  step?: CadenceStepConfig | null;
  reason?: string;
}> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      campaign: true,
      outreachMessages: {
        where: { status: { in: ["SENT", "DELIVERED", "OPENED", "REPLIED"] } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!lead) {
    cadenceLogger.debug("CADENCE_LEAD_NOT_FOUND", { leadId });
    return { shouldSend: false, reason: "Lead não encontrado." };
  }

  // 1. Stop Conditions Imediatas
  if (
    lead.status === "RESPONDED" ||
    lead.status === "HUMAN_REVIEW_REQUIRED" ||
    lead.status === "CONVERTED"
  ) {
    return { shouldSend: false, reason: `Cadência concluída com sucesso (Lead em status '${lead.status}').` };
  }

  if (lead.status === "OPTED_OUT" || lead.cadenceStatus === "STOPPED") {
    return { shouldSend: false, reason: "Cadência interrompida por Opt-Out ou Stop Condition." };
  }

  if (lead.campaign.status === "PAUSED") {
    return { shouldSend: false, reason: "Campanha pausada." };
  }

  // 2. Extrair passos de cadência da campanha ou padrão
  let steps = DEFAULT_CADENCE_STEPS;
  if (lead.campaign.cadenceConfig) {
    try {
      steps = JSON.parse(lead.campaign.cadenceConfig);
    } catch {
      steps = DEFAULT_CADENCE_STEPS;
    }
  }

  const nextStepOrder = lead.currentCadenceStep + 1;
  const targetStep = steps.find((s) => s.stepOrder === nextStepOrder);

  if (!targetStep) {
    return { shouldSend: false, reason: "Todos os passos da cadência foram executados." };
  }

  // 3. Checar intervalo de dias do último envio
  const lastMessage = lead.outreachMessages[0];
  if (lastMessage && targetStep.delayDays > 0) {
    const daysSinceLast =
      (Date.now() - lastMessage.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLast < targetStep.delayDays) {
      return {
        shouldSend: false,
        reason: `Aguardando intervalo da cadência (${daysSinceLast.toFixed(1)}/${targetStep.delayDays} dias).`,
      };
    }
  }

  cadenceLogger.info("CADENCE_STEP_APPROVED", {
    leadId: lead.id,
    stepOrder: targetStep.stepOrder,
    channel: targetStep.channel,
  }, { organizationId: lead.organizationId });

  return {
    shouldSend: true,
    step: targetStep,
  };
}
