import {
  EmailProvider,
  SendEmailPayload,
  SendResult,
  ProviderHealth,
} from "./provider-interface";
import { AppLogger } from "@/lib/logger";

const providerLogger = new AppLogger("mock-email-provider");

export class MockEmailProvider implements EmailProvider {
  name = "MOCK_EMAIL_PROVIDER";
  private failureSimulationCount = 0;
  private shouldFailNext = 0;

  setSimulatedFailures(count: number) {
    providerLogger.warn(`Simulação de falhas de e-mail configurada: ${count}`);
    this.shouldFailNext = count;
    this.failureSimulationCount = 0;
  }

  async getProviderHealth(): Promise<ProviderHealth> {
    providerLogger.debug("Health check do provedor mock de e-mail");
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
    providerLogger.info("Disparando e-mail mock", { to: payload.to, subject: payload.subject });
    if (this.shouldFailNext > 0 && this.failureSimulationCount < this.shouldFailNext) {
      this.failureSimulationCount++;
      providerLogger.warn(`Falha temporária de e-mail simulada: ${this.failureSimulationCount}/${this.shouldFailNext}`);
      throw new Error(
        `[MOCK_EMAIL] Erro temporário de envio simulado (${this.failureSimulationCount}/${this.shouldFailNext})`
      );
    }

    if (!payload.to || !payload.to.includes("@")) {
      providerLogger.warn("Endereço de e-mail inválido recebido", { to: payload.to });
      return {
        success: false,
        providerMessageId: "",
        provider: this.name,
        status: "FAILED",
        errorMessage: "Endereço de e-mail inválido.",
        latencyMs: 20,
      };
    }

    const providerMessageId = `mock-email-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    providerLogger.info("E-mail mock disparado com sucesso", { providerMessageId });

    return {
      success: true,
      providerMessageId,
      provider: this.name,
      status: "DELIVERED",
      latencyMs: 35,
    };
  }
}
