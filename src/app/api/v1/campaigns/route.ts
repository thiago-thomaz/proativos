import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { resolveOpeningDateRange } from "@/lib/date-utils";
import { ICPFilterConfig } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const campaigns = await prisma.campaign.findMany({
      where: { organizationId: user.organizationId },
      include: {
        _count: {
          select: { leads: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const enrichedCampaigns = campaigns.map((camp) => {
      let icp: ICPFilterConfig = { states: [], cities: [], cnaes: [], portes: [] };
      try {
        icp = JSON.parse(camp.icpFilters);
      } catch {}

      const dateRange = resolveOpeningDateRange(icp.openingDate, new Date());

      return {
        ...camp,
        resolvedDateRange: dateRange,
      };
    });

    return NextResponse.json({ success: true, count: enrichedCampaigns.length, campaigns: enrichedCampaigns });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch campaigns", details: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      productName,
      productDescription,
      minScore,
      allowedChannels,
      icpFilters,
      status,
    } = body;

    if (!name || !productName) {
      return NextResponse.json({ error: "Name and productName are required" }, { status: 400 });
    }

    const campaign = await prisma.campaign.create({
      data: {
        organizationId: user.organizationId,
        name,
        productName,
        productDescription: productDescription || null,
        minScore: minScore || 70,
        allowedChannels: Array.isArray(allowedChannels) ? allowedChannels.join(",") : "EMAIL",
        status: status || "SIMULATION",
        icpFilters: typeof icpFilters === "object" ? JSON.stringify(icpFilters) : icpFilters || "{}",
      },
    });

    return NextResponse.json({ success: true, campaign });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create campaign", details: String(error) }, { status: 500 });
  }
}
