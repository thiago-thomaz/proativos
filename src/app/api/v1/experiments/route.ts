import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAbExperiment } from "@/services/revenue/ab-testing";

export async function GET(req: NextRequest) {
  try {
    const org = await prisma.organization.findFirst();
    if (!org) return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });

    const experiments = await prisma.abExperiment.findMany({
      where: { organizationId: org.id },
      include: { variants: true, campaign: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, count: experiments.length, experiments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const org = await prisma.organization.findFirst();
    if (!org) return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });

    const experiment = await createAbExperiment({
      organizationId: org.id,
      campaignId: body.campaignId,
      name: body.name,
      type: body.type,
      minSampleSize: body.minSampleSize,
      variants: body.variants,
    });

    return NextResponse.json({ success: true, experiment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
