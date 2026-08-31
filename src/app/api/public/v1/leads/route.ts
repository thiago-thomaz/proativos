import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticatePublicApiRequest } from "@/services/revenue/public-api-guard";

export async function GET(req: NextRequest) {
  const auth = await authenticatePublicApiRequest(req, "READ_LEADS");
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode || 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

  const leads = await prisma.lead.findMany({
    where: {
      organizationId: auth.organizationId,
      ...(status ? { status } : {}),
    },
    include: {
      company: true,
      campaign: { select: { id: true, name: true } },
    },
    orderBy: { score: "desc" },
    take: limit,
  });

  return NextResponse.json({
    success: true,
    count: leads.length,
    data: leads,
  });
}
