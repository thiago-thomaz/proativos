import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const lead = await prisma.lead.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
      include: {
        company: {
          include: {
            contacts: true,
            events: { orderBy: { createdAt: "desc" }, take: 10 },
          },
        },
        campaign: true,
        events: { orderBy: { createdAt: "desc" }, take: 20 },
        outreachMessages: { orderBy: { createdAt: "desc" } },
        deals: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, lead });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao buscar lead: " + String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, score } = body;

    const existing = await prisma.lead.findFirst({
      where: { id, organizationId: user.organizationId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(score !== undefined ? { score } : {}),
        lastUpdatedAt: new Date(),
      },
    });

    // Se mudou status, registrar evento
    if (status && status !== existing.status) {
      await prisma.leadEvent.create({
        data: {
          leadId: id,
          type: "STATUS_CHANGED",
          description: `Status alterado de ${existing.status} para ${status}`,
        },
      });
    }

    return NextResponse.json({ success: true, lead: updated });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao atualizar lead: " + String(error) },
      { status: 500 }
    );
  }
}
