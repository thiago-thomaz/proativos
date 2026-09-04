import { NextRequest, NextResponse } from "next/server";
import { interpretNaturalLanguageICP } from "@/services/nl-icp-parser";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:icp:interpret");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string") {
      apiLogger.warn("ICP_INTERPRET_MISSING_PROMPT");
      return NextResponse.json({ error: "Prompt em linguagem natural é obrigatório." }, { status: 400 });
    }

    apiLogger.info("ICP_INTERPRET_REQUEST", { promptLength: prompt.length });

    const interpretation = interpretNaturalLanguageICP(prompt);

    apiLogger.info("ICP_INTERPRET_SUCCESS", {
      confidenceScore: interpretation.confidenceScore,
      isAmbiguous: interpretation.isAmbiguous,
    });

    return NextResponse.json({
      success: true,
      interpretation,
    });
  } catch (error) {
    apiLogger.error("ICP_INTERPRET_ERROR", error);
    return NextResponse.json(
      { error: "Falha ao interpretar intenção de ICP", details: String(error) },
      { status: 500 }
    );
  }
}
