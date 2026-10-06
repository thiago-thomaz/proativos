import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { CustomerWebhookEvent } from "@/lib/types";
import { AppLogger } from "@/lib/logger";

const webhookLogger = new AppLogger("customer-webhooks");

export interface DispatchCustomerWebhookParams {
  organizationId: string;
  eventType: CustomerWebhookEvent;
  payload: any;
}

/**
 * Disparador de Webhooks para Clientes (Fase 7)
 * Assina payloads com HMAC-SHA256 e grava histórico de entrega
 */
export async function dispatchCustomerWebhook(params: DispatchCustomerWebhookParams) {
  const { organizationId, eventType, payload } = params;

  const configs = await prisma.customerWebhookConfig.findMany({
    where: {
      organizationId,
      active: true,
    },
  });

  const results: any[] = [];

  for (const config of configs) {
    const subscribed = config.subscribedEvents.split(",").map((e) => e.trim());
    if (!subscribed.includes(eventType) && !subscribed.includes("*")) {
      continue;
    }

    const timestamp = Date.now().toString();
    const rawPayload = JSON.stringify({
      event: eventType,
      timestamp,
      data: payload,
    });

    const signature = crypto
      .createHmac("sha256", config.secret)
      .update(`${timestamp}.${rawPayload}`)
      .digest("hex");

    let status = "SUCCESS";
    let statusCode = 200;
    let latencyMs = 50;
    let errorMessage: string | null = null;
    let attempts = 1;

    // Se a URL for uma URL http/https real externa, faz a chamada HTTP nativa com timeout
    const isLiveUrl = config.url.startsWith("http://") || config.url.startsWith("https://");
    const isMockUrl = config.url.includes("example.com") || config.url.includes("webhook.site/mock") || config.url.includes("localhost/mock");

    if (isLiveUrl && !isMockUrl) {
      const startTime = Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(config.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-PLE-Signature": signature,
            "X-PLE-Timestamp": timestamp,
            "X-PLE-Event": eventType,
            "User-Agent": "ProactiveLeadEngine-Webhook/1.0",
          },
          body: rawPayload,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        latencyMs = Date.now() - startTime;
        statusCode = response.status;
        status = response.ok ? "SUCCESS" : "FAILED";
        if (!response.ok) {
          errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
        }
      } catch (err: any) {
        latencyMs = Date.now() - startTime;
        status = "FAILED";
        statusCode = 500;
        errorMessage = err.name === "AbortError" ? "Request Timeout (4000ms)" : err.message;
      }
    }

    const delivery = await prisma.customerWebhookDelivery.create({
      data: {
        webhookId: config.id,
        eventType,
        payload: rawPayload,
        status,
        statusCode,
        latencyMs,
        attempts,
        errorMessage,
      },
    });

    results.push({ webhookId: config.id, deliveryId: delivery.id, status });
  }

  webhookLogger.info("CUSTOMER_WEBHOOK_DISPATCHED", {
    eventType,
    configsCount: configs.length,
    dispatchedCount: results.length,
  }, { organizationId });

  return { dispatched: results.length, details: results };
}

/**
 * Reprocessa nativamente entregas de webhooks pendentes ou falhas recentes
 * Substitui o antigo workflow 25 do n8n (Customer Webhook Delivery)
 */
export async function processPendingCustomerWebhooks(options?: { limit?: number }) {
  const limit = options?.limit || 20;
  const pendingDeliveries = await prisma.customerWebhookDelivery.findMany({
    where: {
      status: "PENDING",
      attempts: { lt: 3 },
    },
    take: limit,
    include: {
      webhook: true,
    },
    orderBy: { createdAt: "asc" },
  });

  let reprocessed = 0;
  for (const delivery of pendingDeliveries) {
    if (!delivery.webhook || !delivery.webhook.active) {
      await prisma.customerWebhookDelivery.update({
        where: { id: delivery.id },
        data: { status: "FAILED", errorMessage: "Webhook configuration missing or disabled" },
      });
      continue;
    }

    const timestamp = Date.now().toString();
    const signature = crypto
      .createHmac("sha256", delivery.webhook.secret)
      .update(`${timestamp}.${delivery.payload}`)
      .digest("hex");

    let status = "SUCCESS";
    let statusCode = 200;
    let errorMessage: string | null = null;
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(delivery.webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PLE-Signature": signature,
          "X-PLE-Timestamp": timestamp,
          "X-PLE-Event": delivery.eventType,
          "User-Agent": "ProactiveLeadEngine-Webhook/1.0",
        },
        body: delivery.payload,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      status = response.ok ? "SUCCESS" : "FAILED";
      statusCode = response.status;
      if (!response.ok) errorMessage = `HTTP error ${response.status}`;
    } catch (err: any) {
      status = "FAILED";
      statusCode = 500;
      errorMessage = err.message;
    }

    await prisma.customerWebhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status,
        statusCode,
        latencyMs: Date.now() - startTime,
        attempts: delivery.attempts + 1,
        errorMessage,
      },
    });

    reprocessed++;
  }

  return { checked: pendingDeliveries.length, reprocessed };
}

