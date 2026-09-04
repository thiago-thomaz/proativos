import { NextRequest, NextResponse } from "next/server";
import { setGlobalKillSwitch, isGlobalKillSwitchActive } from "@/services/outreach-eligibility";
import { prisma } from "@/lib/prisma";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:outreach:kill-switch");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { target = "GLOBAL", active = true, campaignId, contactId } = body;
    apiLogger.warn("Acionamento de Kill Switch", { target, active, campaignId, contactId });

    if (target === "GLOBAL") {
      setGlobalKillSwitch(active);
      apiLogger.warn(`Kill switch global alterado para: ${active}`);
      return NextResponse.json({
        success: true,
        target: "GLOBAL",
        active: isGlobalKillSwitchActive(),
        message: active
          ? "KILL SWITCH GLOBAL ATIVADO: Todos os disparos foram suspensos."
          : "KILL SWITCH GLOBAL DESATIVADO: Disparos liberados conforme regras.",
      });
    }

    if (target === "CAMPAIGN" && campaignId) {
      const campaign = await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: active ? "PAUSED" : "LIVE" },
      });
      apiLogger.warn(`Status da campanha alterado pelo kill-switch: ${campaign.id}`, { status: campaign.status });
      return NextResponse.json({
        success: true,
        target: "CAMPAIGN",
        campaignId: campaign.id,
        status: campaign.status,
        message: `Campanha '${campaign.name}' ${active ? "PAUSADA" : "ATIVADA"}.`,
      });
    }

    if (target === "CONTACT" && contactId) {
      const contact = await prisma.contact.update({
        where: { id: contactId },
        data: { optOut: active },
      });
      apiLogger.warn(`Opt-out de contato alterado pelo kill-switch: ${contact.id}`, { optOut: contact.optOut });
      return NextResponse.json({
        success: true,
        target: "CONTACT",
        contactId: contact.id,
        optOut: contact.optOut,
        message: `Contato '${contact.nome}' ${active ? "SUPRIMIDO (Opt-Out)" : "LIBERADO"}.`,
      });
    }

    apiLogger.warn("Alvo inválido para kill-switch", { target });
    return NextResponse.json(
      { error: "Alvo inválido para Kill Switch." },
      { status: 400 }
    );
  } catch (error: any) {
    apiLogger.error("Falha ao alterar Kill Switch", { error: error.message, stack: error.stack });
    return NextResponse.json(
      { error: "Falha ao alterar Kill Switch", detail: error.message },
      { status: 500 }
    );
  }
}
