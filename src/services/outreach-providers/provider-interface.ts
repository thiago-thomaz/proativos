export interface SendEmailPayload {
  to: string;
  subject: string;
  body: string;
  idempotencyKey: string;
  organizationId: string;
  metadata?: Record<string, any>;
}

export interface SendWhatsAppPayload {
  toPhone: string;
  messageText: string;
  idempotencyKey: string;
  organizationId: string;
  templateName?: string;
  metadata?: Record<string, any>;
}

export interface SendResult {
  success: boolean;
  providerMessageId: string;
  provider: string;
  status: "SENT" | "DELIVERED" | "QUEUED" | "FAILED";
  errorMessage?: string;
  latencyMs: number;
}

export interface ProviderHealth {
  status: "HEALTHY" | "DEGRADED" | "DOWN";
  latencyMs: number;
  lastCheckedAt: Date;
  message?: string;
}

export interface EmailProvider {
  name: string;
  sendEmail(payload: SendEmailPayload): Promise<SendResult>;
  getDeliveryStatus(providerMessageId: string): Promise<"DELIVERED" | "OPENED" | "FAILED">;
  getProviderHealth(): Promise<ProviderHealth>;
}

export interface WhatsAppProvider {
  name: string;
  sendMessage(payload: SendWhatsAppPayload): Promise<SendResult>;
  getMessageStatus(providerMessageId: string): Promise<"DELIVERED" | "READ" | "FAILED">;
  getProviderHealth(): Promise<ProviderHealth>;
}
