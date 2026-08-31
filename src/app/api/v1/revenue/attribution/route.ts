import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { attributeDealRevenue, getRevenueAttributionReport } from "@/services/revenue/attribution-engine";

export async function GET(req: NextRequest) {
  try {
    const org = await prisma.organization.findFirst();
    if (!org) return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });

    const report = await getRevenueAttributionReport(org.id);
    return NextResponse.json({ success: true, ...report });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const org = await prisma.organization.findFirst();
    if (!org) return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });

    const result = await attributeDealRevenue({
      organizationId: org.id,
      dealId: body.dealId,
      totalRevenue: body.totalRevenue,
      model: body.model,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
