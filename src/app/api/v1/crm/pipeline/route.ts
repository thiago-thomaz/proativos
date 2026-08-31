import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPipelineSummary } from "@/services/revenue/crm-engine";

export async function GET(req: NextRequest) {
  try {
    const org = await prisma.organization.findFirst();
    if (!org) return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });

    const summary = await getPipelineSummary(org.id);
    return NextResponse.json({ success: true, ...summary });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
