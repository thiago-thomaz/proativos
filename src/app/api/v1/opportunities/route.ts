import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/opportunities
 * Lista oportunidades com filtros avançados, ordenação multicritério e paginação
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");
    const priority = searchParams.get("priority");
    const recommendedAction = searchParams.get("recommendedAction");
    const minScore = searchParams.get("minScore");
    const campaignId = searchParams.get("campaignId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const where: any = {};
    if (organizationId) where.organizationId = organizationId;
    if (priority) where.priority = priority;
    if (recommendedAction) where.recommendedAction = recommendedAction;
    if (minScore) where.opportunityScore = { gte: parseInt(minScore, 10) };
    if (campaignId) where.campaignId = campaignId;

    const [total, opportunities] = await Promise.all([
      prisma.opportunityScore.count({ where }),
      prisma.opportunityScore.findMany({
        where,
        include: {
          company: {
            include: {
              contacts: true,
            },
          },
          lead: true,
          campaign: true,
        },
        orderBy: [{ opportunityScore: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      opportunities: opportunities.map((opp) => ({
        ...opp,
        reasons: JSON.parse(opp.reasons || "[]"),
        warnings: JSON.parse(opp.warnings || "[]"),
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao consultar oportunidades" },
      { status: 500 }
    );
  }
}
