import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { dispatchCustomerWebhook } from "@/services/revenue/customer-webhooks";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:webhooks:customer");

export async function GET(req: NextRequest) {
  try {
    apiLogger.info("Listando configurações de webhook de cliente");
    const org = await prisma.organization.findFirst();
    if (!org) {
      apiLogger.warn("Organização não encontrada para listar webhooks de cliente");
      return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });
    }

    const configs = await prisma.customerWebhookConfig.findMany({
      where: { organizationId: org.id },
      include: { deliveries: { take: 10, orderBy: { createdAt: "desc" } } },
    });

    apiLogger.info("Configurações de webhook recuperadas", { count: configs.length });
    return NextResponse.json({ success: true, count: configs.length, configs });
  } catch (error: any) {
    apiLogger.error("Erro ao listar webhooks de cliente", { error: error.message, stack: error.stack });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    apiLogger.info("Processando ação de webhook de cliente", { action: body.action, eventType: body.eventType, url: body.url });

    const org = await prisma.organization.findFirst();
    if (!org) {
      apiLogger.warn("Organização não encontrada para webhook de cliente");
      return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });
    }

    if (body.action === "TEST_TRIGGER") {
      const result = await dispatchCustomerWebhook({
        organizationId: org.id,
        eventType: body.eventType || "lead.created",
        payload: { test: true, leadId: "test_lead_123", timestamp: new Date().toISOString() },
      });
      apiLogger.info("Disparo de teste de webhook concluído", { result });
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

    apiLogger.info("Configuração de webhook criada com sucesso", { id: config.id, url: config.url });
    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    apiLogger.error("Erro ao criar/testar webhook de cliente", { error: error.message, stack: error.stack });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
