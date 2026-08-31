import { NextRequest, NextResponse } from "next/server";
import {
  getDeadLetterMessages,
  retryDeadLetterMessage,
  resolveDeadLetterMessage,
  ignoreDeadLetterMessage,
} from "@/services/dlq-engine";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queueType = searchParams.get("queueType") || undefined;
    const status = searchParams.get("status") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50");

    const messages = await getDeadLetterMessages({ queueType, status, limit });

    return NextResponse.json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Falha ao buscar mensagens da DLQ", detail: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, id, notes } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Parâmetro 'id' da mensagem DLQ é obrigatório." },
        { status: 400 }
      );
    }

    if (action === "RETRY") {
      const result = await retryDeadLetterMessage(id);
      return NextResponse.json(result);
    }

    if (action === "RESOLVE") {
      const result = await resolveDeadLetterMessage(id, notes);
      return NextResponse.json({ success: true, message: result });
    }

    if (action === "IGNORE") {
      const result = await ignoreDeadLetterMessage(id);
      return NextResponse.json({ success: true, message: result });
    }

    return NextResponse.json(
      { error: "Ação inválida. Use RETRY, RESOLVE ou IGNORE." },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: "Falha ao processar ação na DLQ", detail: error.message },
      { status: 500 }
    );
  }
}
