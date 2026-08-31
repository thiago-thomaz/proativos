import { NextRequest, NextResponse } from "next/server";
import { suppressContact } from "@/services/contact-enrichment/enrichment-engine";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json().catch(() => ({}));
    const { reason, organizationId } = body;

    const result = await suppressContact(
      params.id,
      reason || "USER_OPT_OUT",
      organizationId
    );

    return NextResponse.json({
      success: true,
      message: "Contato suprimido com sucesso e adicionado à lista de opt-out",
      result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao suprimir contato", detail: error.message },
      { status: 500 }
    );
  }
}
