import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticatePublicApiRequest } from "@/services/revenue/public-api-guard";
import { enrichCompanyContacts } from "@/services/contact-enrichment/enrichment-engine";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:public:enrichment");

export async function POST(req: NextRequest) {
  const auth = await authenticatePublicApiRequest(req, "ENRICHMENT");
  if (!auth.valid) {
    apiLogger.warn("Falha na autenticação da API pública de enriquecimento", { error: auth.error });
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode || 401 });
  }

  try {
    const body = await req.json();
    apiLogger.info("Solicitação de enriquecimento via API pública", {
      organizationId: auth.organizationId,
      companyId: body.companyId,
      cnpj: body.cnpj,
      provider: body.providerName || body.provider,
    });

    if (!body.companyId && !body.cnpj) {
      apiLogger.warn("companyId ou cnpj ausente na chamada pública");
      return NextResponse.json({ error: "companyId ou cnpj é obrigatório" }, { status: 400 });
    }

    let targetCompanyId = body.companyId;
    if (!targetCompanyId && body.cnpj) {
      const comp = await prisma.company.findUnique({ where: { cnpj: body.cnpj } });
      if (!comp) {
        apiLogger.warn("Empresa não encontrada para CNPJ informado", { cnpj: body.cnpj });
        return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
      }
      targetCompanyId = comp.id;
    }

    const result = await enrichCompanyContacts(targetCompanyId, {
      providerName: body.providerName || body.provider || "RECEITA_QSA",
      organizationId: auth.organizationId,
    });

    apiLogger.info("Enriquecimento via API pública concluído com sucesso", { targetCompanyId, status: result.result?.status, success: result.success });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    apiLogger.error("Erro no enriquecimento via API pública", { error: error.message, stack: error.stack });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
