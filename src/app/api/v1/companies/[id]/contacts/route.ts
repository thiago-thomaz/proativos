import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
      return NextResponse.json(
        { error: "Empresa não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      companyId: company.id,
      razaoSocial: company.razaoSocial,
      cnpj: company.cnpj,
      totalContacts: company.contacts.length,
      contacts: company.contacts,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao buscar contatos da empresa", detail: error.message },
      { status: 500 }
    );
  }
}
