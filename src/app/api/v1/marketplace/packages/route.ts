import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createMarketplacePackage } from "@/services/revenue/marketplace-engine";

export async function GET(req: NextRequest) {
  try {
    const packages = await prisma.marketplacePackage.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, count: packages.length, packages });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pkg = await createMarketplacePackage(body);
    return NextResponse.json({ success: true, package: pkg });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
