import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const intent = searchParams.get("intent");
    const isHandled = searchParams.get("isHandled");

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

    return NextResponse.json({
      success: true,
      summary,
      messages,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Falha ao buscar mensagens da caixa de entrada", detail: error.message },
      { status: 500 }
    );
  }
}
