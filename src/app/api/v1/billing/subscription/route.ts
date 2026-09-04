import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:billing:subscription");

export async function GET(req: NextRequest) {
  try {
    apiLogger.info("Buscando detalhes da assinatura da organização");
    const org = await prisma.organization.findFirst({
      include: {
        subscription: { include: { plan: true } },
        creditAccount: true,
      },
    });

    if (!org) {
      apiLogger.warn("Organização não encontrada para detalhes de assinatura");
      return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });
    }

    apiLogger.info("Assinatura recuperada", { organizationId: org.id, plan: org.plan, status: org.subscription?.status });

    return NextResponse.json({
      success: true,
      organizationId: org.id,
      plan: org.plan,
      subscription: org.subscription,
      credits: org.creditAccount,
    });
  } catch (error: any) {
    apiLogger.error("Erro ao buscar detalhes da assinatura", { error: error.message, stack: error.stack });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
