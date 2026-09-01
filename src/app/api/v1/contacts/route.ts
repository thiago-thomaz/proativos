import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const isDecisionMaker = searchParams.get("decisionMaker");

    const where: any = {};
    if (isDecisionMaker === "true") where.tipo = "DECISION_MAKER";
    if (search) {
      where.OR = [
        { nome: { contains: search } },
        { email: { contains: search } },
        { telefone: { contains: search.replace(/\D/g, "") } },
        { company: { razaoSocial: { contains: search } } },
      ];
    }

    const contacts = await prisma.contact.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            razaoSocial: true,
            nomeFantasia: true,
            cnpj: true,
            municipio: true,
            uf: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      count: contacts.length,
      contacts: contacts.map((c) => ({
        id: c.id,
        nome: c.nome,
        cargo: c.cargo || (c.tipo === "DECISION_MAKER" ? "Sócio / Decisor" : "Contato Cadastral"),
        empresa: c.company?.razaoSocial || "Empresa",
        cnpj: c.company?.cnpj || "",
        tipo: c.tipo === "DECISION_MAKER" ? "DECISOR" : "EMPRESARIAL",
        email: c.email,
        telefone: c.telefone,
        fonte: c.sourceProvider || "ENRICHMENT_API",
        statusVerificacao: "VALID",
        optOut: c.optOut,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
