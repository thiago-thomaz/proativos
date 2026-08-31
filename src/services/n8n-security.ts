import crypto from "crypto";
import { prisma } from "@/lib/prisma";

// Cache in-memory para proteção contra replay (Request IDs processados)
const processedRequestIds = new Map<string, number>();

// Limpeza periódica de nonces expirados (> 10 minutos)
setInterval(() => {
  const now = Date.now();
  for (const [reqId, timestamp] of processedRequestIds.entries()) {
    if (now - timestamp > 10 * 60 * 1000) {
      processedRequestIds.delete(reqId);
    }
  }
}, 60 * 1000).unref();

export interface N8nSecurityValidationResult {
  valid: boolean;
  organizationId?: string;
  apiKeyId?: string;
  errorMessage?: string;
  errorCode?: "INVALID_API_KEY" | "EXPIRED_KEY" | "EXPIRED_TIMESTAMP" | "REPLAY_DETECTED" | "INVALID_SIGNATURE" | "RATE_LIMITED";
}

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function generateHmacSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Validador de Segurança para Chamadas do n8n (Execution Plane -> Control Plane)
 */
export async function validateN8nRequest(params: {
  apiKeyHeader?: string | null;
  signatureHeader?: string | null;
  timestampHeader?: string | null;
  requestIdHeader?: string | null;
  rawPayload?: string;
  requiredPermission?: string;
}): Promise<N8nSecurityValidationResult> {
  const rawKey = params.apiKeyHeader?.replace(/^Bearer\s+/i, "").trim();

  if (!rawKey) {
    return {
      valid: false,
      errorCode: "INVALID_API_KEY",
      errorMessage: "Cabeçalho de autenticação ausente ou malformado (X-API-Key ou Authorization Bearer obrigatório).",
    };
  }

  const hashed = hashApiKey(rawKey);

  // 1. Validar chave no banco
  const apiKeyRecord = await prisma.apiKey.findUnique({
    where: { hashedKey: hashed },
    include: { organization: true },
  });

  if (!apiKeyRecord || !apiKeyRecord.active || !apiKeyRecord.organization.active) {
    return {
      valid: false,
      errorCode: "INVALID_API_KEY",
      errorMessage: "Chave de API inválida, revogada ou organização inativa.",
    };
  }

  // 2. Verificar expiração da chave
  if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt.getTime() < Date.now()) {
    return {
      valid: false,
      errorCode: "EXPIRED_KEY",
      errorMessage: "Chave de API expirada.",
    };
  }

  // 3. Verificar permissão exigida
  if (params.requiredPermission) {
    const allowed = apiKeyRecord.permissions.split(",").map((p) => p.trim());
    if (!allowed.includes(params.requiredPermission) && !allowed.includes("ALL")) {
      return {
        valid: false,
        errorCode: "INVALID_API_KEY",
        errorMessage: `Chave de API não possui a permissão '${params.requiredPermission}'.`,
      };
    }
  }

  // 4. Tolerância de Skew de Timestamp (< 5 minutos)
  if (params.timestampHeader) {
    const reqTime = parseInt(params.timestampHeader, 10);
    const now = Date.now();
    const diff = Math.abs(now - reqTime);

    if (isNaN(reqTime) || diff > 5 * 60 * 1000) {
      return {
        valid: false,
        errorCode: "EXPIRED_TIMESTAMP",
        errorMessage: `Timestamp expirado ou fora da janela de tolerância de 5 minutos (Skew: ${(diff / 1000).toFixed(1)}s).`,
      };
    }
  }

  // 5. Proteção contra Replay Attack (RequestId / Nonce)
  if (params.requestIdHeader) {
    if (processedRequestIds.has(params.requestIdHeader)) {
      return {
        valid: false,
        errorCode: "REPLAY_DETECTED",
        errorMessage: `Replay Attack detectado: Request ID '${params.requestIdHeader}' já foi processado anteriormente.`,
      };
    }
    processedRequestIds.set(params.requestIdHeader, Date.now());
  }

  // 6. Verificação de Assinatura HMAC-SHA256
  if (apiKeyRecord.secretHash && params.signatureHeader && params.rawPayload) {
    const expectedSig = generateHmacSignature(params.rawPayload, apiKeyRecord.secretHash);
    if (params.signatureHeader !== expectedSig) {
      return {
        valid: false,
        errorCode: "INVALID_SIGNATURE",
        errorMessage: "Assinatura digital HMAC-SHA256 inválida para o payload fornecido.",
      };
    }
  }

  // Atualizar lastUsedAt de forma assíncrona
  await prisma.apiKey.update({
    where: { id: apiKeyRecord.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    valid: true,
    organizationId: apiKeyRecord.organizationId,
    apiKeyId: apiKeyRecord.id,
  };
}
