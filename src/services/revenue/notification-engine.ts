import { prisma } from "@/lib/prisma";

export interface SendNotificationInput {
  organizationId: string;
  userId?: string;
  type: "HIGH_OPPORTUNITY" | "MEETING_BOOKED" | "PROPOSAL_SENT" | "DEAL_WON" | "LOW_CREDITS" | "SYSTEM_ALERT";
  title: string;
  message: string;
  link?: string;
  channel?: "IN_APP" | "EMAIL" | "TELEGRAM" | "WHATSAPP";
}

/**
 * Motor Central de Notificações Inteligentes (Fase 7)
 */
export async function sendSmartNotification(input: SendNotificationInput) {
  const notif = await prisma.notification.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId || null,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link || null,
      channel: input.channel || "IN_APP",
      read: false,
    },
  });

  return notif;
}

/**
 * Consulta notificações não lidas de um usuário ou organização
 */
export async function getUnreadNotifications(organizationId: string, userId?: string) {
  return prisma.notification.findMany({
    where: {
      organizationId,
      read: false,
      ...(userId ? { OR: [{ userId }, { userId: null }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

/**
 * Marca notificação como lida
 */
export async function markNotificationAsRead(notificationId: string) {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
}
