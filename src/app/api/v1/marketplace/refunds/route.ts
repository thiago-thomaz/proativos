import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { submitRefundRequest, processRefundDecision } from "@/services/revenue/refund-engine";

export async function GET(req: NextRequest) {
  try {
    const org = await prisma.organization.findFirst();
    if (!org) return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });

    const requests = await prisma.refundRequest.findMany({
      where: { organizationId: org.id },
      include: { leadOwnership: { include: { company: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, count: requests.length, requests });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const org = await prisma.organization.findFirst();
    if (!org) return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });

    if (body.action === "DECISION") {
      const result = await processRefundDecision({
        refundRequestId: body.refundRequestId,
        decision: body.decision,
        reviewerId: body.reviewerId || "SYSTEM_ADMIN",
        decisionNote: body.decisionNote,
      });
      return NextResponse.json({ success: true, ...result });
    }

    const result = await submitRefundRequest({
      organizationId: org.id,
      leadOwnershipId: body.leadOwnershipId,
      reason: body.reason,
      evidence: body.evidence,
    });

    return NextResponse.json({ success: true, refundRequest: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
