import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { AppLogger } from "@/lib/logger";

const apiGuardLogger = new AppLogger("api-guard");

export interface ApiAuthResult {
  valid: boolean;
  organizationId?: string;
  organizationSlug?: string;
  apiKeyId?: string;
  scopes?: string[];
  error?: string;
  statusCode?: number;
}

/**
 * Autenticação e Autorização para a API Pública Versionada (/api/public/v1/*)
 */
export async function authenticatePublicApiRequest(
  req: NextRequest,
  requiredScope?: string
): Promise<ApiAuthResult> {
  const authHeader = req.headers.get("authorization") || req.headers.get("x-api-key");
  const path = req.nextUrl?.pathname || "";
  if (!authHeader) {
    apiGuardLogger.warn("PUBLIC_API_AUTH_MISSING_HEADER", { path });
    return {
      valid: false,
      error: "Cabeçalho de autorização ausente (Authorization: Bearer <key> ou X-Api-Key: <key>).",
      statusCode: 401,
    };
  }

  const rawKey = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!rawKey) {
    apiGuardLogger.warn("PUBLIC_API_AUTH_INVALID_KEY", { path });
    return { valid: false, error: "Chave de API inválida.", statusCode: 401 };
  }

  const hashedKey = crypto.createHash("sha256").update(rawKey).digest("hex");

  const apiKey = await prisma.apiKey.findUnique({
    where: { hashedKey },
    include: { organization: true },
  });

  if (!apiKey || !apiKey.active || !apiKey.organization.active) {
    apiGuardLogger.warn("PUBLIC_API_AUTH_KEY_NOT_FOUND_OR_INACTIVE", { path });
    return { valid: false, error: "Chave de API inativa, revogada ou inexistente.", statusCode: 401 };
  }

  if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
    apiGuardLogger.warn("PUBLIC_API_AUTH_KEY_EXPIRED", { apiKeyId: apiKey.id });
    return { valid: false, error: "Chave de API expirada.", statusCode: 401 };
  }

  const scopes = apiKey.permissions.split(",").map((s) => s.trim().toUpperCase());

  if (requiredScope && !scopes.includes(requiredScope.toUpperCase()) && !scopes.includes("*")) {
    apiGuardLogger.warn("PUBLIC_API_AUTH_SCOPE_DENIED", {
      apiKeyId: apiKey.id,
      requiredScope,
      availableScopes: scopes,
    }, { organizationId: apiKey.organizationId });
    return {
      valid: false,
      error: `Escopo insuficiente. Requer '${requiredScope}'. Escopos disponíveis: ${apiKey.permissions}`,
      statusCode: 403,
    };
  }

  // Atualizar lastUsedAt de forma assíncrona
  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  apiGuardLogger.debug("PUBLIC_API_AUTH_SUCCESS", {
    apiKeyId: apiKey.id,
    organizationId: apiKey.organizationId,
    requiredScope,
  }, { organizationId: apiKey.organizationId });

  return {
    valid: true,
    organizationId: apiKey.organizationId,
    organizationSlug: apiKey.organization.slug,
    apiKeyId: apiKey.id,
    scopes,
  };
}
