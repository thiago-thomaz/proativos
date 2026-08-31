import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDealFromLead } from "@/services/revenue/crm-engine";

export async function GET(req: NextRequest) {
  try {
    const org = await prisma.organization.findFirst();
    if (!org) return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });

    const deals = await prisma.deal.findMany({
      where: { organizationId: org.id },
      include: { company: true, owner: true, campaign: true },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ success: true, count: deals.length, deals });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const org = await prisma.organization.findFirst();
    if (!org) return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });

    const deal = await createDealFromLead({
      organizationId: org.id,
      leadId: body.leadId,
      title: body.title,
      expectedValue: body.expectedValue,
      ownerId: body.ownerId,
      stage: body.stage,
      nextAction: body.nextAction,
    });

    return NextResponse.json({ success: true, deal });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
