import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUnreadNotifications, markNotificationAsRead, sendSmartNotification } from "@/services/revenue/notification-engine";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:notifications");

export async function GET(req: NextRequest) {
  try {
    apiLogger.info("Buscando notificações não lidas");
    const org = await prisma.organization.findFirst();
    if (!org) {
      apiLogger.warn("Organização não encontrada para notificações");
      return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });
    }

    const notifications = await getUnreadNotifications(org.id);
    apiLogger.info("Notificações recuperadas", { count: notifications.length });
    return NextResponse.json({ success: true, count: notifications.length, notifications });
  } catch (error: any) {
    apiLogger.error("Erro ao obter notificações", { error: error.message, stack: error.stack });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    apiLogger.info("Processando ação de notificação", { action: body.action, notificationId: body.notificationId, type: body.type });

    if (body.action === "READ") {
      const read = await markNotificationAsRead(body.notificationId);
      apiLogger.info("Notificação marcada como lida", { notificationId: body.notificationId });
      return NextResponse.json({ success: true, notification: read });
    }

    const org = await prisma.organization.findFirst();
    if (!org) {
      apiLogger.warn("Organização não encontrada para envio de notificação");
      return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });
    }

    const notif = await sendSmartNotification({
      organizationId: org.id,
      userId: body.userId,
      type: body.type,
      title: body.title,
      message: body.message,
      link: body.link,
      channel: body.channel,
    });

    apiLogger.info("Notificação enviada com sucesso", { id: notif.id, type: notif.type });
    return NextResponse.json({ success: true, notification: notif });
  } catch (error: any) {
    apiLogger.error("Erro ao processar notificação", { error: error.message, stack: error.stack });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
