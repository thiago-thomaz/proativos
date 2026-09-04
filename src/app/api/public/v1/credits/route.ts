import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticatePublicApiRequest } from "@/services/revenue/public-api-guard";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:public:credits");

export async function GET(req: NextRequest) {
  const auth = await authenticatePublicApiRequest(req, "READ_CREDITS");
  if (!auth.valid) {
    apiLogger.warn("Falha na autenticação da API pública de créditos", { error: auth.error });
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode || 401 });
  }

  apiLogger.info("Consultando saldo de créditos via API pública", { organizationId: auth.organizationId });

  const account = await prisma.creditAccount.findUnique({
    where: { organizationId: auth.organizationId },
    include: {
      transactions: { take: 10, orderBy: { createdAt: "desc" } },
    },
  });

  apiLogger.info("Saldo de créditos retornado via API pública", {
    organizationId: auth.organizationId,
    balance: account?.balance || 0,
  });

  return NextResponse.json({
    success: true,
    data: {
      balance: account?.balance || 0,
      reserved: account?.reservedBalance || 0,
      available: (account?.balance || 0) - (account?.reservedBalance || 0),
      recentTransactions: account?.transactions || [],
    },
  });
}
