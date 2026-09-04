import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AppLogger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const apiLogger = new AppLogger("api:opportunities:id");

/**
 * GET /api/v1/opportunities/[id]
 * Retorna detalhes completos de uma oportunidade com explicação profunda do score
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const opp = await prisma.opportunityScore.findUnique({
      where: { id: params.id },
      include: {
        company: {
          include: {
            contacts: true,
            events: {
              orderBy: { createdAt: "desc" },
              take: 10,
            },
          },
        },
        lead: {
          include: {
            events: {
              orderBy: { createdAt: "desc" },
              take: 15,
            },
            outreachMessages: {
              orderBy: { createdAt: "desc" },
            },
          },
        },
        campaign: true,
      },
    });

    if (!opp) {
      apiLogger.warn("OPPORTUNITY_NOT_FOUND", { opportunityId: params.id });
      return NextResponse.json(
        { success: false, error: "Oportunidade não encontrada" },
        { status: 404 }
      );
    }

    apiLogger.debug("OPPORTUNITY_FETCHED", {
      opportunityId: opp.id,
      score: opp.opportunityScore,
      priority: opp.priority,
    }, { organizationId: opp.organizationId });

    return NextResponse.json({
      success: true,
      opportunity: {
        ...opp,
        reasons: JSON.parse(opp.reasons || "[]"),
        warnings: JSON.parse(opp.warnings || "[]"),
      },
    });
  } catch (error: any) {
    apiLogger.error("OPPORTUNITY_FETCH_ERROR", error, { opportunityId: params.id });
    return NextResponse.json(
      { success: false, error: error.message || "Erro ao consultar oportunidade" },
      { status: 500 }
    );
  }
}
