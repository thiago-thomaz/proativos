import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { dispatchCustomerWebhook } from "@/services/revenue/customer-webhooks";

export async function GET(req: NextRequest) {
  try {
    const org = await prisma.organization.findFirst();
    if (!org) return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });

    const configs = await prisma.customerWebhookConfig.findMany({
      where: { organizationId: org.id },
      include: { deliveries: { take: 10, orderBy: { createdAt: "desc" } } },
    });

    return NextResponse.json({ success: true, count: configs.length, configs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const org = await prisma.organization.findFirst();
    if (!org) return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });

    if (body.action === "TEST_TRIGGER") {
      const result = await dispatchCustomerWebhook({
        organizationId: org.id,
        eventType: body.eventType || "lead.created",
        payload: { test: true, leadId: "test_lead_123", timestamp: new Date().toISOString() },
      });
      return NextResponse.json({ success: true, ...result });
    }

    const secret = body.secret || `whsec_${crypto.randomBytes(16).toString("hex")}`;
    const config = await prisma.customerWebhookConfig.create({
      data: {
        organizationId: org.id,
        url: body.url,
        secret,
        subscribedEvents: body.subscribedEvents || "lead.created,deal.won",
      },
    });

    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
