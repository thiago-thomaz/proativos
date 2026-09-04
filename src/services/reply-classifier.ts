import { prisma } from "@/lib/prisma";
import { ReplyIntent } from "@/lib/types";
import { AppLogger } from "@/lib/logger";

const replyLogger = new AppLogger("reply-classifier");

/**
 * Classificador de Intenção de Resposta de Inbound (Fase 5)
 */
export function classifyReplyIntent(text: string): ReplyIntent {
  const clean = text.toLowerCase().trim();

  // 1. Detecção de Opt-Out / Descadastro Imediato
  if (
    /n[aã]o\s+quero|pare\s+de\s+enviar|remova\s+meu|remover|descadastrar|n[aã]o\s+tenho\s+interesse|sair|unsubscribe|stop\b|n[aã]o\s+mande\s+mais/i.test(
      clean
    )
  ) {
    return "OPT_OUT";
  }

  // 2. Solicitação de Reunião / Demonstração
  if (
    /agendar|reuni[aã]o|demonstra[çc][aã]o|call\b|pode\s+ligar|marcar\s+um\s+hor[aá]rio|vamos\s+conversar/i.test(
      clean
    )
  ) {
    return "MEETING_REQUEST";
  }

  // 3. Solicitação de Preço / Proposta
  if (
    /quanto\s+custa|qual\s+o\s+valor|pre[çc]o|tabela|or[çc]amento|proposta|valores/i.test(
      clean
    )
  ) {
    return "PRICE_REQUEST";
  }

  // 4. Interesse Geral Positivo
  if (
    /tenho\s+interesse|gostei|quero\s+saber\s+mais|me\s+manda|envia\s+mais\s+detalhes|como\s+funciona\??/i.test(
      clean
    )
  ) {
    return "INTERESTED";
  }

  // 5. Pessoa Errada
  if (
    /n[aã]o\s+sou|n[úu]mero\s+errado|n[aã]o\s+trabalho\s+mais|engano/i.test(
      clean
    )
  ) {
    return "WRONG_PERSON";
  }

  // 6. Momento Inoportuno (Not Now)
  if (
    /agora\s+n[aã]o|m[eê]s\s+que\s+vem|estou\s+ocupado|depois\s+vemos/i.test(
      clean
    )
  ) {
    return "NOT_NOW";
  }

  // 7. Desinteresse Simples
  if (/n[aã]o\s+preciso|j[aá]\s+temos|j[aá]\s+possuo|sem\s+interesse/i.test(clean)) {
    return "NOT_INTERESTED";
  }

  return "UNKNOWN";
}

/**
 * Processador Central de Mensagens Inbound (Respostas)
 */
export async function handleInboundMessage(payload: {
  organizationId: string;
  leadId?: string | null;
  channel: "EMAIL" | "WHATSAPP";
  fromIdentifier: string;
  toIdentifier: string;
  body: string;
}) {
  const intent = classifyReplyIntent(payload.body);

  // 1. Gravar InboundMessage
  const inbound = await prisma.inboundMessage.create({
    data: {
      organizationId: payload.organizationId,
      leadId: payload.leadId || null,
      channel: payload.channel,
      fromIdentifier: payload.fromIdentifier,
      toIdentifier: payload.toIdentifier,
      body: payload.body,
      intentClassification: intent,
    },
  });

  // 2. Se o Lead for conhecido, atualizar timeline e cadência
  if (payload.leadId) {
    const lead = await prisma.lead.findUnique({
      where: { id: payload.leadId },
    });

    if (lead) {
      // Registrar evento de resposta recebida
      await prisma.outreachEvent.create({
        data: {
          leadId: lead.id,
          eventType: "INBOUND_RECEIVED",
          detail: `Resposta recebida via ${payload.channel}: "${payload.body.slice(0, 100)}..." (Intenção: ${intent})`,
        },
      });

      // 3. Ações Baseadas na Intenção
      if (intent === "OPT_OUT" || intent === "UNSUBSCRIBE") {
        // Gravar na SuppressionList
        await prisma.suppressionList.upsert({
          where: {
            organizationId_identifier_channel: {
              organizationId: payload.organizationId,
              identifier: payload.fromIdentifier,
              channel: payload.channel,
            },
          },
          create: {
            organizationId: payload.organizationId,
            identifier: payload.fromIdentifier,
            channel: payload.channel,
            reason: "OPT_OUT_KEYWORD_INBOUND",
            source: "INBOUND_REPLY",
          },
          update: { reason: "OPT_OUT_KEYWORD_INBOUND" },
        });

        // Parar cadência imediatamente
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            status: "OPTED_OUT",
            cadenceStatus: "STOPPED",
            respondedAt: new Date(),
          },
        });

        await prisma.outreachEvent.create({
          data: {
            leadId: lead.id,
            eventType: "OPT_OUT_RECEIVED",
            detail: `Cadência interrompida e contato adicionado à SuppressionList por solicitação expressa.`,
          },
        });
      } else if (
        intent === "INTERESTED" ||
        intent === "MEETING_REQUEST" ||
        intent === "PRICE_REQUEST"
      ) {
        // Human Handoff: Lead qualificado com interesse comercial
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            status: "HUMAN_REVIEW_REQUIRED",
            cadenceStatus: "STOPPED",
            respondedAt: new Date(),
          },
        });

        await prisma.outreachEvent.create({
          data: {
            leadId: lead.id,
            eventType: "HUMAN_HANDOFF",
            detail: `Lead demonstrou interesse (${intent}). Encaminhado ao Inbox para atendimento pelo vendedor.`,
          },
        });
      } else {
        // Outra resposta: pausa a cadência para avaliação
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            status: "RESPONDED",
            cadenceStatus: "STOPPED",
            respondedAt: new Date(),
          },
        });
      }
    }
  }

  replyLogger.info("INBOUND_REPLY_PROCESSED", {
    inboundId: inbound.id,
    intent,
    leadId: payload.leadId || null,
    channel: payload.channel,
  }, { organizationId: payload.organizationId });

  return {
    success: true,
    inboundId: inbound.id,
    intent,
  };
}
