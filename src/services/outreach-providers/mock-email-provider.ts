import {
  EmailProvider,
  SendEmailPayload,
  SendResult,
  ProviderHealth,
} from "./provider-interface";

export class MockEmailProvider implements EmailProvider {
  name = "MOCK_EMAIL_PROVIDER";
  private failureSimulationCount = 0;
  private shouldFailNext = 0;

  setSimulatedFailures(count: number) {
    this.shouldFailNext = count;
    this.failureSimulationCount = 0;
  }

  async getProviderHealth(): Promise<ProviderHealth> {
    return {
      status: "HEALTHY",
      latencyMs: 15,
      lastCheckedAt: new Date(),
      message: "Provedor de email operacional (Sandbox Local).",
    };
  }

  async getDeliveryStatus(providerMessageId: string): Promise<"DELIVERED" | "OPENED" | "FAILED"> {
    return "DELIVERED";
  }

  async sendEmail(payload: SendEmailPayload): Promise<SendResult> {
    if (this.shouldFailNext > 0 && this.failureSimulationCount < this.shouldFailNext) {
      this.failureSimulationCount++;
      throw new Error(
        `[MOCK_EMAIL] Erro temporário de envio simulado (${this.failureSimulationCount}/${this.shouldFailNext})`
      );
    }

    if (!payload.to || !payload.to.includes("@")) {
      return {
        success: false,
        providerMessageId: "",
        provider: this.name,
        status: "FAILED",
        errorMessage: "Endereço de e-mail inválido.",
        latencyMs: 20,
      };
    }

    return {
      success: true,
      providerMessageId: `mock-email-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      provider: this.name,
      status: "DELIVERED",
      latencyMs: 35,
    };
  }
}
