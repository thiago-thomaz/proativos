import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUnreadNotifications, markNotificationAsRead, sendSmartNotification } from "@/services/revenue/notification-engine";

export async function GET(req: NextRequest) {
  try {
    const org = await prisma.organization.findFirst();
    if (!org) return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });

    const notifications = await getUnreadNotifications(org.id);
    return NextResponse.json({ success: true, count: notifications.length, notifications });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.action === "READ") {
      const read = await markNotificationAsRead(body.notificationId);
      return NextResponse.json({ success: true, notification: read });
    }

    const org = await prisma.organization.findFirst();
    if (!org) return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });

    const notif = await sendSmartNotification({
      organizationId: org.id,
      userId: body.userId,
      type: body.type,
      title: body.title,
      message: body.message,
      link: body.link,
      channel: body.channel,
    });

    return NextResponse.json({ success: true, notification: notif });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
