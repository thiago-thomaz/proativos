import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    }

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
    });

    return NextResponse.json({
      success: true,
      balance: creditAccount.balance,
      plan: org?.plan || "STARTER",
      transactions: creditAccount.transactions,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
