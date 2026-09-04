import { NextRequest, NextResponse } from "next/server";
import { runCompanyDiscovery } from "@/services/discovery-engine";
import { validateN8nRequest } from "@/services/n8n-security";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:discovery:run");

export async function POST(req: NextRequest) {
  try {
    const apiKeyHeader = req.headers.get("x-api-key") || req.headers.get("authorization");
    const signatureHeader = req.headers.get("x-signature-sha256");
    const timestampHeader = req.headers.get("x-timestamp");
    const requestIdHeader = req.headers.get("x-request-id");

    const rawText = await req.text();
    let body: any = {};
    if (rawText) {
      try {
        body = JSON.parse(rawText);
      } catch {}
    }

    // Se chave de API fornecida, validar segurança rigorosa
    if (apiKeyHeader) {
      const authResult = await validateN8nRequest({
        apiKeyHeader,
        signatureHeader,
        timestampHeader,
        requestIdHeader,
        rawPayload: rawText,
        requiredPermission: "DISCOVERY",
      });

      if (!authResult.valid) {
        apiLogger.warn("DISCOVERY_AUTH_FAILED", { error: authResult.errorMessage });
        return NextResponse.json(
          { error: "Acesso não autorizado", detail: authResult.errorMessage },
          { status: 401 }
        );
      }
    }

    const { campaignId, organizationId, limit, executionId, resumeFromCheckpoint } = body;

    apiLogger.info("DISCOVERY_RUN_REQUEST", {
      campaignId,
      limit,
      executionId,
      resumeFromCheckpoint,
    }, { organizationId });

    const result = await runCompanyDiscovery({
      campaignId,
      organizationId,
      limit,
      executionId,
      resumeFromCheckpoint,
    });

    apiLogger.info("DISCOVERY_RUN_SUCCESS", {
      executionId: result.executionId,
      discovered: result.companiesDiscovered,
      leadsCreated: result.leadsCreated,
    }, { organizationId });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    apiLogger.error("DISCOVERY_RUN_ERROR", error);
    return NextResponse.json(
      { error: "Falha ao executar descoberta de empresas", detail: error.message },
      { status: 500 }
    );
  }
}
