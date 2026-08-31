import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticatePublicApiRequest } from "@/services/revenue/public-api-guard";

export async function GET(req: NextRequest) {
  const auth = await authenticatePublicApiRequest(req, "READ_CREDITS");
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode || 401 });
  }

  const account = await prisma.creditAccount.findUnique({
    where: { organizationId: auth.organizationId },
    include: {
      transactions: { take: 10, orderBy: { createdAt: "desc" } },
    },
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
