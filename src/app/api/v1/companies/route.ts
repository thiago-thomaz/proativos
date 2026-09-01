import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const uf = searchParams.get("uf");
    const municipio = searchParams.get("municipio");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const where: any = {};
    if (uf) where.uf = uf.toUpperCase();
    if (municipio) where.municipio = { contains: municipio };
    if (search) {
      where.OR = [
        { razaoSocial: { contains: search } },
        { nomeFantasia: { contains: search } },
        { cnpj: { contains: search.replace(/\D/g, "") } },
      ];
    }

    const [total, companies] = await Promise.all([
      prisma.company.count({ where }),
      prisma.company.findMany({
        where,
        take: Math.min(limit, 200),
        orderBy: { dataAbertura: "desc" },
      }),
    ]);

    return NextResponse.json({ success: true, count: companies.length, total, companies });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch companies", details: String(error) }, { status: 500 });
  }
}
