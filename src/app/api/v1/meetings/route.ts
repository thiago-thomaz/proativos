import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scheduleMeeting, listOrganizationMeetings } from "@/services/revenue/meeting-engine";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:meetings");

export async function GET(req: NextRequest) {
  try {
    apiLogger.info("Listando reuniões da organização");
    const org = await prisma.organization.findFirst();
    if (!org) {
      apiLogger.warn("Organização não encontrada para listar reuniões");
      return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });
    }

    const meetings = await listOrganizationMeetings(org.id);
    apiLogger.info("Reuniões recuperadas", { count: meetings.length });
    return NextResponse.json({ success: true, count: meetings.length, meetings });
  } catch (error: any) {
    apiLogger.error("Erro ao listar reuniões", { error: error.message, stack: error.stack });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    apiLogger.info("Agendando nova reunião", { leadId: body.leadId, dealId: body.dealId, title: body.title, scheduledAt: body.scheduledAt });

    const org = await prisma.organization.findFirst();
    if (!org) {
      apiLogger.warn("Organização não encontrada para agendar reunião");
      return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });
    }

    const meeting = await scheduleMeeting({
      organizationId: org.id,
      leadId: body.leadId,
      dealId: body.dealId,
      ownerId: body.ownerId,
      title: body.title,
      scheduledAt: new Date(body.scheduledAt),
      durationMinutes: body.durationMinutes,
      meetingLink: body.meetingLink,
      notes: body.notes,
    });

    apiLogger.info("Reunião agendada com sucesso", { id: meeting.id, scheduledAt: meeting.scheduledAt });
    return NextResponse.json({ success: true, meeting });
  } catch (error: any) {
    apiLogger.error("Erro ao agendar reunião", { error: error.message, stack: error.stack });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
