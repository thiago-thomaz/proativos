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

export interface ProcessMeetingRemindersResult {
  meetingsChecked: number;
  remindersSent: {
    t24h: number;
    t6h: number;
    t1h: number;
  };
  details: Array<{
    meetingId: string;
    window: "T-24H" | "T-6H" | "T-1H";
    recipientUserId?: string | null;
    status: "SENT" | "SKIPPED";
  }>;
}

/**
 * Rotina Nativa de Lembretes de Agendamento (T-24h, T-6h, T-1h)
 * Executa verificação periódica de reuniões e dispara notificações e réguas de clientes
 * 100% nativa sem dependência de ferramentas externas.
 */
export async function processMeetingReminders(options?: {
  organizationId?: string;
  referenceTime?: Date;
  dryRun?: boolean;
}): Promise<ProcessMeetingRemindersResult> {
  const now = options?.referenceTime || new Date();
  const dryRun = options?.dryRun ?? false;

  const upcomingMeetings = await prisma.meeting.findMany({
    where: {
      status: { in: ["SCHEDULED", "CONFIRMED"] },
      scheduledAt: { gte: now },
      ...(options?.organizationId ? { organizationId: options.organizationId } : {}),
    },
    include: {
      lead: { include: { company: true } },
      deal: true,
      owner: true,
    },
    orderBy: { scheduledAt: "asc" },
  });

  const result: ProcessMeetingRemindersResult = {
    meetingsChecked: upcomingMeetings.length,
    remindersSent: { t24h: 0, t6h: 0, t1h: 0 },
    details: [],
  };

  for (const meeting of upcomingMeetings) {
    const diffHours = (meeting.scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Identificar janela de lembrete
    let windowType: "T-24H" | "T-6H" | "T-1H" | null = null;
    let label = "";

    if (diffHours >= 22.0 && diffHours <= 26.0) {
      windowType = "T-24H";
      label = "Lembrete: Reunião em 24 horas";
    } else if (diffHours >= 5.0 && diffHours <= 7.0) {
      windowType = "T-6H";
      label = "Lembrete: Reunião em 6 horas";
    } else if (diffHours >= 0.5 && diffHours <= 1.5) {
      windowType = "T-1H";
      label = "Lembrete: Reunião em 1 hora";
    }

    if (!windowType) {
      continue;
    }

    // Verificação de idempotência: verificar se já existe notificação para esta reunião nesta janela
    const marker = `[REMINDER_${windowType}_${meeting.id}]`;
    const alreadySent = await prisma.notification.findFirst({
      where: {
        organizationId: meeting.organizationId,
        message: { contains: marker },
      },
    });

    if (alreadySent) {
      result.details.push({
        meetingId: meeting.id,
        window: windowType,
        recipientUserId: meeting.ownerId,
        status: "SKIPPED",
      });
      continue;
    }

    if (!dryRun) {
      // Disparar notificação nativa para o responsável
      await prisma.notification.create({
        data: {
          organizationId: meeting.organizationId,
          userId: meeting.ownerId || null,
          type: "SYSTEM_ALERT",
          title: `${label} — ${meeting.lead?.company?.razaoSocial || meeting.title}`,
          message: `${label}: "${meeting.title}" agendada para ${meeting.scheduledAt.toLocaleTimeString("pt-BR")}. Link: ${meeting.meetingLink || "Nenhum"} ${marker}`,
          link: `/meetings`,
          channel: "IN_APP",
        },
      });

      // Registrar evento na linha do tempo do lead
      await prisma.leadEvent.create({
        data: {
          leadId: meeting.leadId,
          type: `MEETING_${windowType}_TRIGGERED`,
          description: `Disparo automático de régua de reunião (${windowType}): ${meeting.title}`,
          metadata: JSON.stringify({
            meetingId: meeting.id,
            window: windowType,
            scheduledAt: meeting.scheduledAt.toISOString(),
          }),
        },
      });

      if (meeting.dealId) {
        await prisma.dealEvent.create({
          data: {
            dealId: meeting.dealId,
            eventType: "NOTE_ADDED",
            note: `Régua automática disparada: ${label}`,
            actorId: meeting.ownerId || null,
          },
        });
      }
    }

    if (windowType === "T-24H") result.remindersSent.t24h++;
    if (windowType === "T-6H") result.remindersSent.t6h++;
    if (windowType === "T-1H") result.remindersSent.t1h++;

    result.details.push({
      meetingId: meeting.id,
      window: windowType,
      recipientUserId: meeting.ownerId,
      status: "SENT",
    });

    meetingLogger.info("MEETING_REMINDER_TRIGGERED", {
      meetingId: meeting.id,
      window: windowType,
      leadId: meeting.leadId,
      scheduledAt: meeting.scheduledAt,
    }, { organizationId: meeting.organizationId, userId: meeting.ownerId || undefined });
  }

  return result;
}

