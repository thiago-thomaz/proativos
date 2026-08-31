import { NextRequest, NextResponse } from "next/server";
import { interpretNaturalLanguageICP } from "@/services/nl-icp-parser";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt em linguagem natural é obrigatório." }, { status: 400 });
    }

    const interpretation = interpretNaturalLanguageICP(prompt);

    return NextResponse.json({
      success: true,
      interpretation,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Falha ao interpretar intenção de ICP", details: String(error) },
      { status: 500 }
    );
  }
}
