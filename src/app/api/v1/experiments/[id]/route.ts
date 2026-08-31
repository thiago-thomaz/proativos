import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateExperimentWinner, recordVariantEvent } from "@/services/revenue/ab-testing";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const evaluation = await evaluateExperimentWinner(params.id);
    return NextResponse.json({ success: true, ...evaluation });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const result = await recordVariantEvent(body.variantId, body.event);
    return NextResponse.json({ success: true, variant: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
