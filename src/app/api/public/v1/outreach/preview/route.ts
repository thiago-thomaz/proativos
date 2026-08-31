import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticatePublicApiRequest } from "@/services/revenue/public-api-guard";
import { checkOutreachEligibility } from "@/services/outreach-eligibility";

export async function POST(req: NextRequest) {
  const auth = await authenticatePublicApiRequest(req, "OUTREACH");
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode || 401 });
  }

  try {
    const body = await req.json();
    if (!body.leadId) {
      return NextResponse.json({ error: "leadId é obrigatório" }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({ where: { id: body.leadId } });
    if (!lead) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }

    const campaignId = body.campaignId || lead.campaignId;
    const eligibility = await checkOutreachEligibility(body.leadId, campaignId, {
      simulationMode: true,
    });

    return NextResponse.json({ success: true, data: eligibility });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
