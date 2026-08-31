import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scheduleMeeting, listOrganizationMeetings } from "@/services/revenue/meeting-engine";

export async function GET(req: NextRequest) {
  try {
    const org = await prisma.organization.findFirst();
    if (!org) return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });

    const meetings = await listOrganizationMeetings(org.id);
    return NextResponse.json({ success: true, count: meetings.length, meetings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const org = await prisma.organization.findFirst();
    if (!org) return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });

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

    return NextResponse.json({ success: true, meeting });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
