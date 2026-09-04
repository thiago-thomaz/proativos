import { NextRequest, NextResponse } from "next/server";
import { evaluateCompanyAgainstICP } from "@/services/icp-engine";
import { CompanyEvaluationInput } from "@/services/icp-engine";
import { ICPStructuredDefinition, ICPFilterConfig } from "@/lib/types";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:icp:score");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { company, icp } = body as {
      company: CompanyEvaluationInput;
      icp: ICPStructuredDefinition | ICPFilterConfig;
    };

    if (!company || !icp) {
      apiLogger.warn("ICP_SCORE_BAD_REQUEST_MISSING_DATA");
      return NextResponse.json(
        { error: "Campos 'company' e 'icp' são obrigatórios." },
        { status: 400 }
      );
    }

    const result = evaluateCompanyAgainstICP(company, icp, new Date());

    apiLogger.debug("ICP_SCORE_EVALUATED", {
      cnpj: company.cnpj,
      score: result.score,
      matched: result.matched,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    apiLogger.error("ICP_SCORE_ERROR", error);
    return NextResponse.json(
      { error: "Falha ao calcular score do ICP", details: String(error) },
      { status: 500 }
    );
  }
}
