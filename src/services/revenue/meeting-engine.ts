import { prisma } from "@/lib/prisma";
import { MeetingStatus } from "@/lib/types";
import { AppLogger } from "@/lib/logger";

const meetingLogger = new AppLogger("meeting");

export interface ScheduleMeetingInput {
  organizationId: string;
  leadId: string;
  dealId?: string;
  ownerId?: string;
  title: string;
  scheduledAt: Date;
  durationMinutes?: number;
  meetingLink?: string;
  notes?: string;
}

/**
 * Motor de Reuniões e Agendamentos Comerciais (Fase 7)
 */
export async function scheduleMeeting(input: ScheduleMeetingInput) {
  const meeting = await prisma.meeting.create({
    data: {
      organizationId: input.organizationId,
      leadId: input.leadId,
      dealId: input.dealId || null,
      ownerId: input.ownerId || null,
      title: input.title,
      scheduledAt: input.scheduledAt,
      durationMinutes: input.durationMinutes || 30,
      status: "SCHEDULED",
      meetingLink: input.meetingLink || "https://meet.google.com/proactive-lead-demo",
      notes: input.notes || null,
    },
  });

  // Atualizar estágio do Deal para MEETING se aplicável (preservando deals já fechados)
  if (input.dealId) {
    const currentDeal = await prisma.deal.findUnique({
      where: { id: input.dealId },
      select: { stage: true },
    });

    if (currentDeal && currentDeal.stage !== "WON" && currentDeal.stage !== "LOST") {
      await prisma.deal.update({
        where: { id: input.dealId },
        data: {
          stage: "MEETING",
          probability: 60,
          nextAction: `Reunião marcada para ${input.scheduledAt.toLocaleDateString("pt-BR")}`,
          nextActionAt: input.scheduledAt,
        },
      });
    }

    await prisma.dealEvent.create({
      data: {
        dealId: input.dealId,
        eventType: "MEETING_LINKED",
        toStage: currentDeal?.stage || "MEETING",
        note: `Reunião agendada: ${input.title}`,
        actorId: input.ownerId || null,
      },
    });
  }

  // Notificar usuário responsável
  if (input.ownerId) {
    await prisma.notification.create({
      data: {
        organizationId: input.organizationId,
        userId: input.ownerId,
        type: "MEETING_BOOKED",
        title: "Nova Reunião Agendada",
        message: `${input.title} marcada para ${input.scheduledAt.toLocaleString("pt-BR")}`,
        link: `/meetings`,
      },
    });
  }

  meetingLogger.info("MEETING_SCHEDULED", {
    meetingId: meeting.id,
    leadId: input.leadId,
    dealId: input.dealId,
    scheduledAt: input.scheduledAt,
  }, { organizationId: input.organizationId, userId: input.ownerId });

  return meeting;
}

/**
 * Atualiza status da reunião com auditoria
 */
export async function updateMeetingStatus(meetingId: string, status: MeetingStatus, notes?: string) {
  const meeting = await prisma.meeting.update({
    where: { id: meetingId },
    data: {
      status,
      ...(notes ? { notes } : {}),
    },
  });

  meetingLogger.info("MEETING_STATUS_UPDATED", {
    meetingId,
    status,
  }, { organizationId: meeting.organizationId });

  return meeting;
}

/**
 * Lista reuniões agendadas da organização com filtros
 */
export async function listOrganizationMeetings(organizationId: string, status?: MeetingStatus) {
  return prisma.meeting.findMany({
    where: {
      organizationId,
      ...(status ? { status } : {}),
    },
    include: {
      lead: { include: { company: true } },
      deal: true,
      owner: true,
    },
    orderBy: { scheduledAt: "asc" },
  });
}
