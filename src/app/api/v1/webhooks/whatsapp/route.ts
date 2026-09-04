import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleInboundMessage } from "@/services/reply-classifier";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:webhooks:whatsapp");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, providerMessageId, fromPhone, toPhone, messageText, organizationId } = body;
    apiLogger.info("Webhook WhatsApp recebido", { event, providerMessageId, fromPhone: fromPhone ? "***" : undefined, organizationId });

    // 1. Inbound WhatsApp Message
    if (event === "INBOUND" || fromPhone) {
      const cleanPhone = (fromPhone || "").replace(/\D/g, "");
      const targetOrg = organizationId || "global";

      // Identificar lead pelo telefone
      const contact = await prisma.contact.findFirst({
        where: { telefone: cleanPhone },
        include: { company: { include: { leads: true } } },
      });

      const leadId = contact?.company?.leads[0]?.id || null;

      const inboundRes = await handleInboundMessage({
        organizationId: targetOrg,
        leadId,
        channel: "WHATSAPP",
        fromIdentifier: cleanPhone,
        toIdentifier: toPhone || "11999999999",
        body: messageText || "",
      });

      apiLogger.info("Mensagem WhatsApp inbound processada", { leadId, intent: inboundRes?.intent });

      return NextResponse.json({
        success: true,
        type: "INBOUND_PROCESSED",
        inboundRes,
      });
    }

    // 2. Status Updates (DELIVERED, READ, FAILED)
    if (providerMessageId) {
      const statusMap: Record<string, string> = {
        delivered: "DELIVERED",
        read: "OPENED",
        failed: "FAILED",
      };

      const newStatus = statusMap[event] || "DELIVERED";

      const msg = await prisma.outreachMessage.findFirst({
        where: { providerMessageId },
      });

      if (msg) {
        await prisma.outreachMessage.update({
          where: { id: msg.id },
          data: {
            status: newStatus,
            deliveredAt: newStatus === "DELIVERED" ? new Date() : msg.deliveredAt,
            openedAt: newStatus === "OPENED" ? new Date() : msg.openedAt,
          },
        });

        await prisma.outreachEvent.create({
          data: {
            leadId: msg.leadId,
            messageId: msg.id,
            eventType: `MESSAGE_${newStatus}`,
            detail: `Status atualizado via Webhook de WhatsApp: ${newStatus}`,
          },
        });

        apiLogger.info("Status de mensagem WhatsApp atualizado", { messageId: msg.id, status: newStatus });
      }
    }

    return NextResponse.json({ success: true, processed: true });
  } catch (error: any) {
    apiLogger.error("Falha ao processar webhook de whatsapp", { error: error.message, stack: error.stack });
    return NextResponse.json(
      { error: "Falha ao processar webhook de whatsapp", detail: error.message },
      { status: 500 }
    );
  }
}
