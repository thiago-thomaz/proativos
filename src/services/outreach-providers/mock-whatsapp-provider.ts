import {
  WhatsAppProvider,
  SendWhatsAppPayload,
  SendResult,
  ProviderHealth,
} from "./provider-interface";
import { AppLogger } from "@/lib/logger";

const providerLogger = new AppLogger("mock-whatsapp-provider");

export class MockWhatsAppProvider implements WhatsAppProvider {
  name = "MOCK_WHATSAPP_PROVIDER";
  private failureSimulationCount = 0;
  private shouldFailNext = 0;

  setSimulatedFailures(count: number) {
    providerLogger.warn(`Simulação de falhas de WhatsApp configurada: ${count}`);
    this.shouldFailNext = count;
    this.failureSimulationCount = 0;
  }

  async getProviderHealth(): Promise<ProviderHealth> {
    providerLogger.debug("Health check do provedor mock de WhatsApp");
    return {
      status: "HEALTHY",
      latencyMs: 25,
      lastCheckedAt: new Date(),
      message: "Provedor de WhatsApp operacional (Sandbox Local).",
    };
  }

  async getMessageStatus(providerMessageId: string): Promise<"DELIVERED" | "READ" | "FAILED"> {
    return "DELIVERED";
  }

  async sendMessage(payload: SendWhatsAppPayload): Promise<SendResult> {
    providerLogger.info("Disparando WhatsApp mock", { toPhone: "***" });
    if (this.shouldFailNext > 0 && this.failureSimulationCount < this.shouldFailNext) {
      this.failureSimulationCount++;
      providerLogger.warn(`Falha temporária de WhatsApp simulada: ${this.failureSimulationCount}/${this.shouldFailNext}`);
      throw new Error(
        `[MOCK_WHATSAPP] Erro temporário de envio simulado (${this.failureSimulationCount}/${this.shouldFailNext})`
      );
    }

    const clean = payload.toPhone.replace(/\D/g, "");
    if (clean.length < 10) {
      providerLogger.warn("Número de telefone inválido para WhatsApp");
      return {
        success: false,
        providerMessageId: "",
        provider: this.name,
        status: "FAILED",
        errorMessage: "Número de telefone inválido para WhatsApp.",
        latencyMs: 15,
      };
    }

    const providerMessageId = `mock-wa-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    providerLogger.info("WhatsApp mock disparado com sucesso", { providerMessageId });

    return {
      success: true,
      providerMessageId,
      provider: this.name,
      status: "DELIVERED",
      latencyMs: 45,
    };
  }
}
