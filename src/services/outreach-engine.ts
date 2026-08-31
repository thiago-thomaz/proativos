import { prisma } from "@/lib/prisma";
import { checkOutreachEligibility } from "./outreach-eligibility";
import { personalizeMessage } from "./message-personalizer";
import { getNextCadenceStep, DEFAULT_CADENCE_STEPS } from "./cadence-engine";
import { MockEmailProvider } from "./outreach-providers/mock-email-provider";
import { MockWhatsAppProvider } from "./outreach-providers/mock-whatsapp-provider";

export interface OutreachSendOptions {
  forceChannel?: "EMAIL" | "WHATSAPP";
  customBody?: string;
  customSubject?: string;
  idempotencyKey?: string;
  simulationMode?: boolean;
  ignoreBusinessHoursForTesting?: boolean;
}

/**
 * Motor Central de Disparo e Orquestração de Outreach (Fase 5)
 */
export async function sendOutreachMessage(
  leadId: string,
  campaignId: string,
  options: OutreachSendOptions = {}
) {
  // 1. Idempotência Precoce: se a mensagem com esta chave já existe, retornar imediatamente
  if (options.idempotencyKey) {
    const existingMsg = await prisma.outreachMessage.findUnique({
      where: { idempotencyKey: options.idempotencyKey },
    });

    if (existingMsg) {
      return {
        success: true,
        message: existingMsg,
        isIdempotentReplay: true,
      };
    }
  }

  // 2. Checagem de Elegibilidade do Lead (Lead Gatekeeper)
  const eligibility = await checkOutreachEligibility(leadId, campaignId, {
    ignoreBusinessHoursForTesting: options.ignoreBusinessHoursForTesting,
    simulationMode: options.simulationMode,
  });

  if (!eligibility.eligible && !options.simulationMode) {
    throw new Error(`Lead não elegível para outreach: ${eligibility.blockedReasons.join("; ")}`);
  }

  // 2. Buscar Lead, Empresa, Contato e Campanha
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      company: {
        include: {
          contacts: true,
        },
      },
      campaign: true,
      organization: {
        include: {
          creditAccount: true,
        },
      },
    },
  });

  if (!lead) {
    throw new Error(`Lead '${leadId}' não encontrado.`);
  }

  const campaign = lead.campaign;
  const channel = options.forceChannel || eligibility.recommendedChannel || "EMAIL";
  const contact = eligibility.targetContact || lead.company.contacts[0];

  // 3. Cadência & Template
  const cadenceEval = await getNextCadenceStep(lead.id);
  const currentStep = cadenceEval.step || DEFAULT_CADENCE_STEPS[0];

  const rawBody = options.customBody || currentStep.body;
  const rawSubject = options.customSubject || currentStep.subject || `Apresentação: ${campaign.productName}`;

  // 4. Personalização Contextual
  const personalized = personalizeMessage(rawBody, {
    company: lead.company,
    contact,
    campaign: {
      productName: campaign.productName,
      productDescription: campaign.productDescription,
      organizationName: lead.organization.name,
    },
  });

  const personalizedSubject = personalizeMessage(rawSubject, {
    company: lead.company,
    contact,
    campaign: {
      productName: campaign.productName,
      productDescription: campaign.productDescription,
      organizationName: lead.organization.name,
    },
  }).personalized;

  // 5. Idempotência
  const idempotencyKey =
    options.idempotencyKey || `outreach-${lead.id}-step${currentStep.stepOrder}-${Date.now()}`;

  const existingMsg = await prisma.outreachMessage.findUnique({
    where: { idempotencyKey },
  });

  if (existingMsg) {
    return {
      success: true,
      message: existingMsg,
      isIdempotentReplay: true,
    };
  }

  // 6. Modo Simulação
  if (options.simulationMode || campaign.status === "SIMULATION") {
    const simMsg = await prisma.outreachMessage.create({
      data: {
        organizationId: lead.organizationId,
        campaignId: campaign.id,
        leadId: lead.id,
        contactId: contact?.id || null,
        cadenceStep: currentStep.stepOrder,
        channel,
        status: "DELIVERED",
        provider: "SIMULATION_MODE",
        providerMessageId: `sim-${Date.now()}`,
        subject: personalizedSubject,
        body: personalized.personalized,
        idempotencyKey,
        sentAt: new Date(),
        deliveredAt: new Date(),
      },
    });

    await prisma.outreachEvent.create({
      data: {
        leadId: lead.id,
        messageId: simMsg.id,
        eventType: "MESSAGE_SENT",
        detail: `[SIMULAÇÃO] Mensagem simulada para ${contact?.nome || "Lead"} via ${channel}.`,
      },
    });

    return {
      success: true,
      mode: "SIMULATION",
      message: simMsg,
      personalizedBody: personalized.personalized,
      personalizedSubject,
    };
  }

  // 7. Dedução de Créditos (Proteção de Saldo)
  const creditAccount = lead.organization.creditAccount;
  if (!creditAccount || creditAccount.balance < 1) {
    throw new Error("Saldo de créditos insuficiente para realizar outreach.");
  }

  await prisma.creditAccount.update({
    where: { id: creditAccount.id },
    data: { balance: { decrement: 1 } },
  });

  await prisma.creditTransaction.create({
    data: {
      accountId: creditAccount.id,
      amount: -1,
      type: channel === "EMAIL" ? "EMAIL_SEND" : "WHATSAPP_SEND",
      description: `Disparo de mensagem de outreach (${channel}) para lead ${lead.company.razaoSocial}`,
    },
  });

  // 8. Disparo via Provider Abstraction
  let sendResult: any = null;
  if (channel === "EMAIL") {
    const emailProvider = new MockEmailProvider();
    sendResult = await emailProvider.sendEmail({
      to: contact?.email || "contato@empresa.com.br",
      subject: personalizedSubject,
      body: personalized.personalized,
      idempotencyKey,
      organizationId: lead.organizationId,
    });
  } else {
    const waProvider = new MockWhatsAppProvider();
    sendResult = await waProvider.sendMessage({
      toPhone: contact?.telefone || "11999999999",
      messageText: personalized.personalized,
      idempotencyKey,
      organizationId: lead.organizationId,
    });
  }

  // 9. Gravar OutreachMessage no Banco
  const outreachMsg = await prisma.outreachMessage.create({
    data: {
      organizationId: lead.organizationId,
      campaignId: campaign.id,
      leadId: lead.id,
      contactId: contact?.id || null,
      cadenceStep: currentStep.stepOrder,
      channel,
      status: sendResult.success ? "DELIVERED" : "FAILED",
      provider: sendResult.provider,
      providerMessageId: sendResult.providerMessageId,
      subject: personalizedSubject,
      body: personalized.personalized,
      idempotencyKey,
      errorMessage: sendResult.errorMessage,
      sentAt: new Date(),
      deliveredAt: sendResult.success ? new Date() : null,
    },
  });

  // 10. Atualizar Status do Lead e Cadência
  if (sendResult.success) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: "CONTACTED",
        contactedAt: new Date(),
        currentCadenceStep: currentStep.stepOrder,
        cadenceStatus: "IN_PROGRESS",
      },
    });

    await prisma.outreachEvent.create({
      data: {
        leadId: lead.id,
        messageId: outreachMsg.id,
        eventType: "MESSAGE_SENT",
        detail: `Mensagem enviada com sucesso via ${channel} (Step ${currentStep.stepOrder}) para ${contact?.nome || "Lead"}.`,
      },
    });
  } else {
    await prisma.outreachEvent.create({
      data: {
        leadId: lead.id,
        messageId: outreachMsg.id,
        eventType: "MESSAGE_FAILED",
        detail: `Falha no envio via ${channel}: ${sendResult.errorMessage}`,
      },
    });
  }

  return {
    success: sendResult.success,
    message: outreachMsg,
    personalizedBody: personalized.personalized,
    personalizedSubject,
  };
}
