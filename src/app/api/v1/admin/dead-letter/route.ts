import { NextRequest, NextResponse } from "next/server";
import {
  getDeadLetterMessages,
  retryDeadLetterMessage,
  resolveDeadLetterMessage,
  ignoreDeadLetterMessage,
} from "@/services/dlq-engine";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:admin:dead-letter");

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queueType = searchParams.get("queueType") || undefined;
    const status = searchParams.get("status") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50");
    apiLogger.info("Consultando mensagens da Dead Letter Queue", { queueType, status, limit });

    const messages = await getDeadLetterMessages({ queueType, status, limit });
    apiLogger.info("Mensagens DLQ recuperadas", { count: messages.length });

    return NextResponse.json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (error: any) {
    apiLogger.error("Falha ao buscar mensagens da DLQ", { error: error.message, stack: error.stack });
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
    apiLogger.info("Processando ação na DLQ", { action, id });

    if (!id) {
      apiLogger.warn("ID ausente para ação na DLQ");
      return NextResponse.json(
        { error: "Parâmetro 'id' da mensagem DLQ é obrigatório." },
        { status: 400 }
      );
    }

    if (action === "RETRY") {
      const result = await retryDeadLetterMessage(id);
      apiLogger.info("Retry de mensagem DLQ executado", { id, success: result.success });
      return NextResponse.json(result);
    }

    if (action === "RESOLVE") {
      const result = await resolveDeadLetterMessage(id, notes);
      apiLogger.info("Mensagem DLQ resolvida", { id });
      return NextResponse.json({ success: true, message: result });
    }

    if (action === "IGNORE") {
      const result = await ignoreDeadLetterMessage(id);
      apiLogger.info("Mensagem DLQ ignorada", { id });
      return NextResponse.json({ success: true, message: result });
    }

    apiLogger.warn("Ação inválida na DLQ", { action });
    return NextResponse.json(
      { error: "Ação inválida. Use RETRY, RESOLVE ou IGNORE." },
      { status: 400 }
    );
  } catch (error: any) {
    apiLogger.error("Falha ao processar ação na DLQ", { error: error.message, stack: error.stack });
    return NextResponse.json(
      { error: "Falha ao processar ação na DLQ", detail: error.message },
      { status: 500 }
    );
  }
}
