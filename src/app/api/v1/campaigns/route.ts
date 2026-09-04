import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { resolveOpeningDateRange } from "@/lib/date-utils";
import { ICPFilterConfig } from "@/lib/types";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:campaigns");

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      apiLogger.warn("Acesso não autorizado na listagem de campanhas");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    apiLogger.info("Listando campanhas da organização", { organizationId: user.organizationId });
    const campaigns = await prisma.campaign.findMany({
      where: { organizationId: user.organizationId },
      include: {
        _count: {
          select: { leads: true, outreachMessages: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const enrichedCampaigns = campaigns.map((camp) => {
      let icp: any = { states: [], cities: [], cnaes: [], portes: [] };
      try {
        icp = JSON.parse(camp.icpFilters);
      } catch {}

      const dateRange = resolveOpeningDateRange(icp.openingDate, new Date());

      return {
        ...camp,
        leadsCount: camp._count?.leads || 0,
        contactedCount: camp._count?.outreachMessages || 0,
        resolvedDateRange: dateRange,
        cnaeDescription: icp?.industry?.mainCnaes?.join(", ") || icp?.cnaes?.join(", ") || "Geral",
        states: icp?.location?.ufs || icp?.states || ["Brasil"],
        openedDays: icp?.openingDate?.preset ? (icp.openingDate.preset === "LAST_3_DAYS" ? 3 : icp.openingDate.preset === "LAST_7_DAYS" ? 7 : 30) : 15,
      };
    });

    apiLogger.info("Campanhas recuperadas com sucesso", { count: enrichedCampaigns.length });
    return NextResponse.json({ success: true, count: enrichedCampaigns.length, campaigns: enrichedCampaigns });
  } catch (error) {
    apiLogger.error("Falha ao buscar campanhas", { error: String(error) });
    return NextResponse.json({ error: "Failed to fetch campaigns", details: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      apiLogger.warn("Acesso não autorizado na criação de campanha");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      productName,
      productDescription,
      minScore,
      allowedChannels,
      icpFilters,
      status,
    } = body;
    apiLogger.info("Criando nova campanha", { name, productName, organizationId: user.organizationId });

    if (!name || !productName) {
      apiLogger.warn("Parâmetros obrigatórios ausentes para criação de campanha");
      return NextResponse.json({ error: "Nome da campanha e produto são obrigatórios" }, { status: 400 });
    }

    const campaign = await prisma.campaign.create({
      data: {
        organizationId: user.organizationId,
        name,
        productName,
        productDescription: productDescription || null,
        minScore: minScore || 70,
        allowedChannels: Array.isArray(allowedChannels) ? allowedChannels.join(",") : typeof allowedChannels === "string" ? allowedChannels : "EMAIL",
        status: status || "SIMULATION",
        icpFilters: typeof icpFilters === "object" ? JSON.stringify(icpFilters) : icpFilters || "{}",
      },
    });

    apiLogger.info("Campanha criada com sucesso", { id: campaign.id, name: campaign.name });
    return NextResponse.json({ success: true, campaign });
  } catch (error) {
    apiLogger.error("Falha ao criar campanha", { error: String(error) });
    return NextResponse.json({ error: "Failed to create campaign", details: String(error) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      apiLogger.warn("Acesso não autorizado na atualização de campanha");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, status, name, minScore } = body;
    apiLogger.info("Atualizando campanha", { id, status, name, minScore });

    if (!id) {
      apiLogger.warn("Campaign ID ausente na atualização");
      return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 });
    }

    // Verificar se a campanha pertence à organização do usuário (Multi-Tenant)
    const existing = await prisma.campaign.findFirst({
      where: { id, organizationId: user.organizationId },
    });

    if (!existing) {
      apiLogger.warn("Campanha não encontrada ou não autorizada para atualização", { id, organizationId: user.organizationId });
      return NextResponse.json({ error: "Campanha não encontrada ou não autorizada" }, { status: 404 });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (name) updateData.name = name;
    if (minScore !== undefined) updateData.minScore = minScore;

    const updated = await prisma.campaign.update({
      where: { id },
      data: updateData,
    });

    apiLogger.info("Campanha atualizada com sucesso", { id: updated.id, status: updated.status });
    return NextResponse.json({ success: true, campaign: updated });
  } catch (error) {
    apiLogger.error("Falha ao atualizar campanha", { error: String(error) });
    return NextResponse.json({ error: "Failed to update campaign", details: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      apiLogger.warn("Acesso não autorizado na exclusão de campanha");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    apiLogger.info("Excluindo campanha", { id });

    if (!id) {
      apiLogger.warn("Campaign ID ausente na exclusão");
      return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 });
    }

    const existing = await prisma.campaign.findFirst({
      where: { id, organizationId: user.organizationId },
    });

    if (!existing) {
      apiLogger.warn("Campanha não encontrada para exclusão", { id });
      return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 });
    }

    await prisma.campaign.delete({
      where: { id },
    });

    apiLogger.info("Campanha excluída com sucesso", { id });
    return NextResponse.json({ success: true, message: "Campanha excluída com sucesso" });
  } catch (error) {
    apiLogger.error("Falha ao excluir campanha", { error: String(error) });
    return NextResponse.json({ error: "Failed to delete campaign", details: String(error) }, { status: 500 });
  }
}
