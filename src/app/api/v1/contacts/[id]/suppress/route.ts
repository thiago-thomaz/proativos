import { NextRequest, NextResponse } from "next/server";
import { suppressContact } from "@/services/contact-enrichment/enrichment-engine";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:contacts:suppress");

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json().catch(() => ({}));
    const { reason, organizationId } = body;

    apiLogger.info("CONTACT_SUPPRESS_REQUEST", { contactId: params.id, reason }, { organizationId });

    const result = await suppressContact(
      params.id,
      reason || "USER_OPT_OUT",
      organizationId
    );

    apiLogger.info("CONTACT_SUPPRESS_SUCCESS", { contactId: params.id }, { organizationId });

    return NextResponse.json({
      success: true,
      message: "Contato suprimido com sucesso e adicionado à lista de opt-out",
      result,
    });
  } catch (error: any) {
    apiLogger.error("CONTACT_SUPPRESS_ERROR", error, { contactId: params.id });
    return NextResponse.json(
      { error: "Erro ao suprimir contato", detail: error.message },
      { status: 500 }
    );
  }
}
