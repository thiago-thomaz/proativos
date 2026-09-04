import { NextRequest, NextResponse } from "next/server";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:auth:logout");

export async function POST(req: NextRequest) {
  apiLogger.info("Encerrando sessão de usuário");
  const response = NextResponse.json({ success: true, message: "Sessão encerrada com sucesso." });
  response.cookies.delete("auth_token");
  return response;
}
