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
    const campaignId = searchParams.get("campaignId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {
      organizationId: user.organizationId,
    };
    if (campaignId) where.campaignId = campaignId;
    if (status && status !== "ALL") where.status = status;

    const leads = await prisma.lead.findMany({
      where,
      include: {
        company: {
          include: { contacts: true },
        },
        campaign: true,
      },
      orderBy: { firstDetectedAt: "desc" },
    });

    return NextResponse.json({ success: true, count: leads.length, leads });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch leads", details: String(error) }, { status: 500 });
  }
}
