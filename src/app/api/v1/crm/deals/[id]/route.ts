import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateDealStage } from "@/services/revenue/crm-engine";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const deal = await prisma.deal.findUnique({
      where: { id: params.id },
      include: {
        company: { include: { contacts: true } },
        owner: true,
        lead: { include: { outreachMessages: true } },
        events: { orderBy: { createdAt: "desc" } },
        meetings: true,
        attributions: true,
      },
    });

    if (!deal) return NextResponse.json({ error: "Deal não encontrado" }, { status: 404 });
    return NextResponse.json({ success: true, deal });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const updated = await updateDealStage({
      dealId: params.id,
      toStage: body.stage,
      actualValue: body.actualValue,
      lostReason: body.lostReason,
      note: body.note,
      actorId: body.actorId,
    });

    return NextResponse.json({ success: true, deal: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
