import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:companies");

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

    apiLogger.debug("COMPANIES_LISTED", { count: companies.length, total, uf, municipio });

    return NextResponse.json({ success: true, count: companies.length, total, companies });
  } catch (error) {
    apiLogger.error("COMPANIES_FETCH_ERROR", error);
    return NextResponse.json({ error: "Failed to fetch companies", details: String(error) }, { status: 500 });
  }
}
