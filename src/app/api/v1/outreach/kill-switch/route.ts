import { NextRequest, NextResponse } from "next/server";
import { setGlobalKillSwitch, isGlobalKillSwitchActive } from "@/services/outreach-eligibility";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { target = "GLOBAL", active = true, campaignId, contactId } = body;

    if (target === "GLOBAL") {
      setGlobalKillSwitch(active);
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
      return NextResponse.json({
        success: true,
        target: "CONTACT",
        contactId: contact.id,
        optOut: contact.optOut,
        message: `Contato '${contact.nome}' ${active ? "SUPRIMIDO (Opt-Out)" : "LIBERADO"}.`,
      });
    }

    return NextResponse.json(
      { error: "Alvo inválido para Kill Switch." },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: "Falha ao alterar Kill Switch", detail: error.message },
      { status: 500 }
    );
  }
}
