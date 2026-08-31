import { NextRequest, NextResponse } from "next/server";
import { evaluateCompanyAgainstICP } from "@/services/icp-engine";
import { CompanyEvaluationInput } from "@/services/icp-engine";
import { ICPStructuredDefinition, ICPFilterConfig } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { company, icp } = body as {
      company: CompanyEvaluationInput;
      icp: ICPStructuredDefinition | ICPFilterConfig;
    };

    if (!company || !icp) {
      return NextResponse.json(
        { error: "Campos 'company' e 'icp' são obrigatórios." },
        { status: 400 }
      );
    }

    const result = evaluateCompanyAgainstICP(company, icp, new Date());

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Falha ao calcular score do ICP", details: String(error) },
      { status: 500 }
    );
  }
}
