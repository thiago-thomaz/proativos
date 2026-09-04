import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:compliance:opt-out");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { organizationId, identifier, channel, reason, source } = body;
    apiLogger.info("Registrando opt-out de compliance", { identifier, channel, reason, source, organizationId });

    if (!identifier) {
      apiLogger.warn("Identificador ausente para registro de opt-out");
      return NextResponse.json({ error: "Identifier is required" }, { status: 400 });
    }

    const orgId = organizationId || (await prisma.organization.findFirst())?.id;
    if (!orgId) {
      apiLogger.warn("Organização não encontrada para opt-out");
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Upsert to suppression list
    const record = await prisma.suppressionList.upsert({
      where: {
        organizationId_identifier_channel: {
          organizationId: orgId,
          identifier: identifier.trim(),
          channel: channel || "ALL",
        },
      },
      update: {
        reason: reason || "Opt-out solicitado",
        source: source || "API_REQUEST",
      },
      create: {
        organizationId: orgId,
        identifier: identifier.trim(),
        channel: channel || "ALL",
        reason: reason || "Opt-out solicitado",
        source: source || "API_REQUEST",
      },
    });

    apiLogger.info("Opt-out registrado com sucesso", {
      organizationId: orgId,
      identifier,
      channel: channel || "ALL",
      reason,
    });

    return NextResponse.json({ success: true, message: "Opt-out registrado com sucesso", record });
  } catch (error) {
    apiLogger.error("Falha ao processar opt-out", { error: String(error) });
    return NextResponse.json({ error: "Failed to process opt-out", details: String(error) }, { status: 500 });
  }
}
