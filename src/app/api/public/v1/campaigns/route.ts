import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticatePublicApiRequest } from "@/services/revenue/public-api-guard";

export async function GET(req: NextRequest) {
  const auth = await authenticatePublicApiRequest(req, "READ_CAMPAIGNS");
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode || 401 });
  }

  const campaigns = await prisma.campaign.findMany({
    where: { organizationId: auth.organizationId },
    select: {
      id: true,
      name: true,
      productName: true,
      status: true,
      minScore: true,
      productPrice: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ success: true, count: campaigns.length, data: campaigns });
}

export async function POST(req: NextRequest) {
  const auth = await authenticatePublicApiRequest(req, "WRITE_CAMPAIGNS");
  if (!auth.valid) {
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode || 401 });
  }

  try {
    const body = await req.json();
    const campaign = await prisma.campaign.create({
      data: {
        organizationId: auth.organizationId!,
        name: body.name,
        productName: body.productName,
        status: body.status || "DRAFT",
        minScore: body.minScore || 70,
        productPrice: body.productPrice || 0,
        icpFilters: typeof body.icpFilters === "string" ? body.icpFilters : JSON.stringify(body.icpFilters || {}),
      },
    });

    return NextResponse.json({ success: true, data: campaign });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
