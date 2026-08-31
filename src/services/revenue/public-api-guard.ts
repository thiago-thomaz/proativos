import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

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
  if (!authHeader) {
    return {
      valid: false,
      error: "Cabeçalho de autorização ausente (Authorization: Bearer <key> ou X-Api-Key: <key>).",
      statusCode: 401,
    };
  }

  const rawKey = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!rawKey) {
    return { valid: false, error: "Chave de API inválida.", statusCode: 401 };
  }

  const hashedKey = crypto.createHash("sha256").update(rawKey).digest("hex");

  const apiKey = await prisma.apiKey.findUnique({
    where: { hashedKey },
    include: { organization: true },
  });

  if (!apiKey || !apiKey.active || !apiKey.organization.active) {
    return { valid: false, error: "Chave de API inativa, revogada ou inexistente.", statusCode: 401 };
  }

  if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
    return { valid: false, error: "Chave de API expirada.", statusCode: 401 };
  }

  const scopes = apiKey.permissions.split(",").map((s) => s.trim().toUpperCase());

  if (requiredScope && !scopes.includes(requiredScope.toUpperCase()) && !scopes.includes("*")) {
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

  return {
    valid: true,
    organizationId: apiKey.organizationId,
    organizationSlug: apiKey.organization.slug,
    apiKeyId: apiKey.id,
    scopes,
  };
}
