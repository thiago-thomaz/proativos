import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const uf = searchParams.get("uf");
    const municipio = searchParams.get("municipio");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const where: Record<string, unknown> = {};
    if (uf) where.uf = uf.toUpperCase();
    if (municipio) where.municipio = { contains: municipio };

    const companies = await prisma.company.findMany({
      where,
      take: Math.min(limit, 200),
      orderBy: { dataAbertura: "desc" },
    });

    return NextResponse.json({ success: true, count: companies.length, companies });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch companies", details: String(error) }, { status: 500 });
  }
}
