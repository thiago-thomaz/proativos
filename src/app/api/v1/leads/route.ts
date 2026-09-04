import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:leads");

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      apiLogger.warn("LEADS_LIST_UNAUTHORIZED");
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

    apiLogger.debug("LEADS_LISTED", { count: leads.length, campaignId, status }, {
      organizationId: user.organizationId,
      userId: user.id,
    });

    return NextResponse.json({ success: true, count: leads.length, leads });
  } catch (error) {
    apiLogger.error("LEADS_FETCH_ERROR", error);
    return NextResponse.json({ error: "Failed to fetch leads", details: String(error) }, { status: 500 });
  }
}
