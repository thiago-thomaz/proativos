import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:inbox");

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      apiLogger.warn("Acesso não autorizado na caixa de entrada");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const intent = searchParams.get("intent");
    const isHandled = searchParams.get("isHandled");
    apiLogger.info("Buscando mensagens da caixa de entrada", {
      userId: user.id,
      organizationId: user.organizationId,
      intent,
      isHandled,
    });

    const messages = await prisma.inboundMessage.findMany({
      where: {
        lead: {
          organizationId: user.organizationId,
        },
        ...(intent && intent !== "ALL" ? { intentClassification: intent } : {}),
        ...(isHandled !== null && isHandled !== undefined ? { isHandled: isHandled === "true" } : {}),
      },
      orderBy: { receivedAt: "desc" },
      take: 50,
      include: {
        lead: {
          include: {
            company: {
              include: { contacts: true },
            },
            campaign: true,
          },
        },
      },
    });

    const summary = {
      total: messages.length,
      interested: messages.filter((m) => m.intentClassification === "INTERESTED").length,
      meetings: messages.filter((m) => m.intentClassification === "MEETING_REQUEST").length,
      priceRequests: messages.filter((m) => m.intentClassification === "PRICE_REQUEST").length,
      optOuts: messages.filter((m) => m.intentClassification === "OPT_OUT").length,
    };

    apiLogger.info("Mensagens da caixa de entrada recuperadas", {
      total: summary.total,
      interested: summary.interested,
      meetings: summary.meetings,
    });

    return NextResponse.json({
      success: true,
      summary,
      messages,
    });
  } catch (error: any) {
    apiLogger.error("Falha ao buscar mensagens da caixa de entrada", { error: error.message, stack: error.stack });
    return NextResponse.json(
      { error: "Falha ao buscar mensagens da caixa de entrada", detail: error.message },
      { status: 500 }
    );
  }
}
