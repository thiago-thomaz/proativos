import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:companies:contacts");

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const company = await prisma.company.findUnique({
      where: { id: params.id },
      include: {
        contacts: {
          orderBy: [{ confidenceScore: "desc" }, { createdAt: "desc" }],
        },
      },
    });

    if (!company) {
      apiLogger.warn("COMPANY_CONTACTS_NOT_FOUND", { companyId: params.id });
      return NextResponse.json(
        { error: "Empresa não encontrada" },
        { status: 404 }
      );
    }

    apiLogger.debug("COMPANY_CONTACTS_FETCHED", { companyId: company.id, count: company.contacts.length });

    return NextResponse.json({
      companyId: company.id,
      razaoSocial: company.razaoSocial,
      cnpj: company.cnpj,
      totalContacts: company.contacts.length,
      contacts: company.contacts,
    });
  } catch (error: any) {
    apiLogger.error("COMPANY_CONTACTS_ERROR", error, { companyId: params.id });
    return NextResponse.json(
      { error: "Erro ao buscar contatos da empresa", detail: error.message },
      { status: 500 }
    );
  }
}
