import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buyMarketplacePackage } from "@/services/revenue/marketplace-engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const org = await prisma.organization.findFirst();
    if (!org) return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });

    const result = await buyMarketplacePackage({
      organizationId: org.id,
      packageId: body.packageId,
      campaignId: body.campaignId,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
