import { NextRequest, NextResponse } from "next/server";
import { updateMeetingStatus } from "@/services/revenue/meeting-engine";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const updated = await updateMeetingStatus(params.id, body.status, body.notes);
    return NextResponse.json({ success: true, meeting: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
