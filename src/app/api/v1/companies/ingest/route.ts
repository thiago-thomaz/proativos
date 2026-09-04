import { NextRequest, NextResponse } from "next/server";
import { processCompanyBatch } from "@/services/data-ingestion/ingestion-engine";
import { RawCompanyRecord } from "@/services/data-providers/provider-interface";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:companies:ingest");

export async function POST(req: NextRequest) {
  try {
    // Autenticação por Header ou Token API
    const authHeader = req.headers.get("authorization");
    const apiKey = req.headers.get("x-api-key");

    if (!authHeader && !apiKey && process.env.NODE_ENV === "production") {
      apiLogger.warn("INGEST_UNAUTHORIZED");
      return NextResponse.json({ error: "Unauthorized: API Key or Authorization header required" }, { status: 401 });
    }

    const body = await req.json();
    const {
      provider,
      mode,
      dryRun,
      checkpoint,
      correlationId,
      batch,
      companies,
      autoMatchICP,
    } = body;

    const records: RawCompanyRecord[] = batch || companies || [];

    if (!Array.isArray(records) || records.length === 0) {
      apiLogger.warn("INGEST_BAD_REQUEST_EMPTY_BATCH");
      return NextResponse.json(
        { error: "Campo 'batch' ou 'companies' deve ser um array com ao menos 1 registro." },
        { status: 400 }
      );
    }

    apiLogger.info("INGEST_REQUEST_RECEIVED", {
      recordsCount: records.length,
      provider: provider || "API_DIRECT",
      mode: mode || "INCREMENTAL",
      dryRun: Boolean(dryRun),
      correlationId,
    });

    const summary = await processCompanyBatch(records, {
      providerName: provider || "API_DIRECT",
      mode: mode || "INCREMENTAL",
      dryRun: Boolean(dryRun),
      checkpoint,
      correlationId,
      autoMatchICP: autoMatchICP !== false,
    });

    apiLogger.info("INGEST_REQUEST_COMPLETED", {
      recordsRead: summary.recordsRead,
      recordsCreated: summary.recordsCreated,
      recordsUpdated: summary.recordsUpdated,
      leadsCreated: summary.leadsCreated,
    });

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error) {
    apiLogger.error("INGEST_REQUEST_ERROR", error);
    return NextResponse.json(
      { error: "Falha na ingestão de dados", details: String(error) },
      { status: 500 }
    );
  }
}
