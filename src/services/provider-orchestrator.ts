import { prisma } from "@/lib/prisma";
import { pushToDeadLetterQueue } from "./dlq-engine";

export type ProviderHealthStatus = "HEALTHY" | "DEGRADED" | "DOWN";

export interface UniversalProvider<TInput = any, TOutput = any> {
  name: string;
  version: string;
  capabilities: string[];
  healthCheck(): Promise<{ status: ProviderHealthStatus; latencyMs: number; error?: string }>;
  getCost(): number;
  execute(input: TInput): Promise<TOutput>;
  normalizeResponse(raw: any): TOutput;
}

// Registro global de provedores em memória
const registeredProviders = new Map<string, UniversalProvider>();

export function registerProvider(provider: UniversalProvider) {
  registeredProviders.set(provider.name, provider);
}

export function getRegisteredProvider(name: string): UniversalProvider | undefined {
  return registeredProviders.get(name);
}

export interface ExecuteWithFailoverOptions {
  primaryProvider: UniversalProvider;
  secondaryProvider?: UniversalProvider;
  queueType: "DISCOVERY" | "ENRICHMENT" | "OUTREACH" | "WEBHOOK";
  organizationId?: string;
  campaignId?: string;
  executionId?: string;
  maxRetries?: number;
}

/**
 * Orquestrador Central de Execução com Health Check, Failover e DLQ (Fase 6)
 */
export async function executeWithFailover<TInput = any, TOutput = any>(
  input: TInput,
  options: ExecuteWithFailoverOptions
): Promise<{ success: boolean; data?: TOutput; providerUsed: string; failoverOccurred: boolean; error?: string }> {
  const { primaryProvider, secondaryProvider, queueType, organizationId, campaignId, executionId } = options;

  const start = Date.now();

  // 1. Tentar Provedor Primário
  try {
    const data = await primaryProvider.execute(input);
    const latency = Date.now() - start;

    // Atualizar métricas do provedor no banco de forma assíncrona
    prisma.providerConfig.upsert({
      where: { providerName: primaryProvider.name },
      create: {
        providerName: primaryProvider.name,
        healthStatus: "HEALTHY",
        lastSyncAt: new Date(),
        lastLatencyMs: latency,
      },
      update: {
        healthStatus: "HEALTHY",
        lastSyncAt: new Date(),
        lastLatencyMs: latency,
      },
    }).catch(() => {});

    return {
      success: true,
      data: primaryProvider.normalizeResponse(data),
      providerUsed: primaryProvider.name,
      failoverOccurred: false,
    };
  } catch (primaryError: any) {
    const primaryErrMsg = primaryError.message || "Erro desconhecido no provedor primário";

    // Marcar provedor primário como degradado ou down
    prisma.providerConfig.upsert({
      where: { providerName: primaryProvider.name },
      create: {
        providerName: primaryProvider.name,
        healthStatus: "DEGRADED",
        lastSyncAt: new Date(),
        lastErrorMessage: primaryErrMsg,
      },
      update: {
        healthStatus: "DEGRADED",
        lastSyncAt: new Date(),
        lastErrorMessage: primaryErrMsg,
      },
    }).catch(() => {});

    // 2. Se houver provedor secundário configurado, executar Failover
    if (secondaryProvider) {
      try {
        const secStart = Date.now();
        const secData = await secondaryProvider.execute(input);
        const secLatency = Date.now() - secStart;

        prisma.providerConfig.upsert({
          where: { providerName: secondaryProvider.name },
          create: {
            providerName: secondaryProvider.name,
            healthStatus: "HEALTHY",
            lastSyncAt: new Date(),
            lastLatencyMs: secLatency,
          },
          update: {
            healthStatus: "HEALTHY",
            lastSyncAt: new Date(),
            lastLatencyMs: secLatency,
          },
        }).catch(() => {});

        return {
          success: true,
          data: secondaryProvider.normalizeResponse(secData),
          providerUsed: secondaryProvider.name,
          failoverOccurred: true,
        };
      } catch (secError: any) {
        const secErrMsg = secError.message || "Erro no provedor secundário de failover";

        // Ambos falharam -> Enviar para Dead Letter Queue
        await pushToDeadLetterQueue({
          queueType,
          payload: input,
          errorMessage: `Falha em ambos os provedores (${primaryProvider.name}: ${primaryErrMsg} | ${secondaryProvider.name}: ${secErrMsg})`,
          errorStack: secError.stack,
          provider: `${primaryProvider.name}->${secondaryProvider.name}`,
          organizationId,
          campaignId,
          executionId,
        });

        return {
          success: false,
          providerUsed: "NONE",
          failoverOccurred: true,
          error: `Falha sustentada nos provedores primário e secundário. Enviado para DLQ.`,
        };
      }
    }

    // Sem provedor secundário -> Enviar direto para Dead Letter Queue
    await pushToDeadLetterQueue({
      queueType,
      payload: input,
      errorMessage: `Falha no provedor primário (${primaryProvider.name}): ${primaryErrMsg}`,
      errorStack: primaryError.stack,
      provider: primaryProvider.name,
      organizationId,
      campaignId,
      executionId,
    });

    return {
      success: false,
      providerUsed: primaryProvider.name,
      failoverOccurred: false,
      error: `Falha no provedor primário: ${primaryErrMsg}. Enviado para DLQ.`,
    };
  }
}
