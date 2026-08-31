import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const creditAccount = await prisma.creditAccount.findUnique({
      where: { organizationId: user.organizationId },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    return NextResponse.json({
      success: true,
      balance: creditAccount?.balance || 0,
      transactions: creditAccount?.transactions || [],
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch credit details", details: String(error) }, { status: 500 });
  }
}
