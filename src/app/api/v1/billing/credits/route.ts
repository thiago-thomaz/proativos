import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:billing:credits");

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      apiLogger.warn("Acesso não autorizado ao saldo de créditos");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    apiLogger.info("Buscando saldo de créditos da organização", { organizationId: user.organizationId });
    let creditAccount = await prisma.creditAccount.findUnique({
      where: { organizationId: user.organizationId },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!creditAccount) {
      creditAccount = await prisma.creditAccount.create({
        data: {
          organizationId: user.organizationId,
          balance: 100,
        },
        include: { transactions: true },
      });
      apiLogger.info("Conta de créditos criada automaticamente", { organizationId: user.organizationId, initialBalance: 100 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
    });

    apiLogger.info("Saldo de créditos recuperado", { organizationId: user.organizationId, balance: creditAccount.balance, plan: org?.plan });

    return NextResponse.json({
      success: true,
      balance: creditAccount.balance,
      plan: org?.plan || "STARTER",
      transactions: creditAccount.transactions,
    });
  } catch (error: any) {
    apiLogger.error("Erro ao buscar créditos", { error: error.message, stack: error.stack });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
