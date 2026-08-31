import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticatePublicApiRequest } from "@/services/revenue/public-api-guard";
import { enrichCompanyContacts } from "@/services/contact-enrichment/enrichment-engine";

export async function POST(req: NextRequest) {
  const auth = await authenticatePublicApiRequest(req, "ENRICHMENT");
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode || 401 });
  }

  try {
    const body = await req.json();
    if (!body.companyId && !body.cnpj) {
      return NextResponse.json({ error: "companyId ou cnpj é obrigatório" }, { status: 400 });
    }

    let targetCompanyId = body.companyId;
    if (!targetCompanyId && body.cnpj) {
      const comp = await prisma.company.findUnique({ where: { cnpj: body.cnpj } });
      if (!comp) return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
      targetCompanyId = comp.id;
    }

    const result = await enrichCompanyContacts(targetCompanyId, {
      providerName: body.providerName || body.provider || "RECEITA_QSA",
      organizationId: auth.organizationId,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
