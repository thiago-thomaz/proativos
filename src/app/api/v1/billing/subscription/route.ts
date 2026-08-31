import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const org = await prisma.organization.findFirst({
      include: {
        subscription: { include: { plan: true } },
        creditAccount: true,
      },
    });

    if (!org) return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });

    return NextResponse.json({
      success: true,
      organizationId: org.id,
      plan: org.plan,
      subscription: org.subscription,
      credits: org.creditAccount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
