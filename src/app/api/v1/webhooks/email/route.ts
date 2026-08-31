import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleInboundMessage } from "@/services/reply-classifier";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, providerMessageId, email, from, to, subject, messageBody, organizationId } = body;

    // 1. Inbound Email (Resposta do lead)
    if (event === "INBOUND" || from) {
      const fromEmail = from || email;
      const targetOrg = organizationId || "global";

      // Identificar lead pelo e-mail
      const contact = await prisma.contact.findFirst({
        where: { email: fromEmail },
        include: { company: { include: { leads: true } } },
      });

      const leadId = contact?.company?.leads[0]?.id || null;

      const inboundRes = await handleInboundMessage({
        organizationId: targetOrg,
        leadId,
        channel: "EMAIL",
        fromIdentifier: fromEmail,
        toIdentifier: to || "contato@empresa.com.br",
        body: messageBody || subject || "",
      });

      return NextResponse.json({
        success: true,
        type: "INBOUND_PROCESSED",
        inboundRes,
      });
    }

    // 2. Delivery / Open / Click Status Updates
    if (providerMessageId) {
      const statusMap: Record<string, string> = {
        delivered: "DELIVERED",
        opened: "OPENED",
        clicked: "OPENED",
        bounced: "FAILED",
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
            detail: `Status atualizado via Webhook de E-mail: ${newStatus}`,
          },
        });
      }
    }

    return NextResponse.json({ success: true, processed: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Falha ao processar webhook de email", detail: error.message },
      { status: 500 }
    );
  }
}
