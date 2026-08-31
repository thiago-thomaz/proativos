import {
  WhatsAppProvider,
  SendWhatsAppPayload,
  SendResult,
  ProviderHealth,
} from "./provider-interface";

export class MockWhatsAppProvider implements WhatsAppProvider {
  name = "MOCK_WHATSAPP_PROVIDER";
  private failureSimulationCount = 0;
  private shouldFailNext = 0;

  setSimulatedFailures(count: number) {
    this.shouldFailNext = count;
    this.failureSimulationCount = 0;
  }

  async getProviderHealth(): Promise<ProviderHealth> {
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
    if (this.shouldFailNext > 0 && this.failureSimulationCount < this.shouldFailNext) {
      this.failureSimulationCount++;
      throw new Error(
        `[MOCK_WHATSAPP] Erro temporário de envio simulado (${this.failureSimulationCount}/${this.shouldFailNext})`
      );
    }

    const clean = payload.toPhone.replace(/\D/g, "");
    if (clean.length < 10) {
      return {
        success: false,
        providerMessageId: "",
        provider: this.name,
        status: "FAILED",
        errorMessage: "Número de telefone inválido para WhatsApp.",
        latencyMs: 15,
      };
    }

    return {
      success: true,
      providerMessageId: `mock-wa-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      provider: this.name,
      status: "DELIVERED",
      latencyMs: 45,
    };
  }
}
