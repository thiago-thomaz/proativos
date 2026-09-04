import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signToken } from "@/lib/auth";
import { UserRole } from "@/lib/types";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:auth:login");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      apiLogger.warn("LOGIN_FAILED_MISSING_CREDENTIALS");
      return NextResponse.json(
        { error: "E-mail e senha são obrigatórios." },
        { status: 400 }
      );
    }

    // Buscar usuário pelo e-mail
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { organization: true },
    });

    if (!user || !user.active) {
      apiLogger.warn("LOGIN_FAILED_USER_NOT_FOUND_OR_INACTIVE", { email });
      return NextResponse.json(
        { error: "Credenciais inválidas ou usuário inativo." },
        { status: 401 }
      );
    }

    // Verificar senha
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      apiLogger.warn("LOGIN_FAILED_INVALID_PASSWORD", { email });
      return NextResponse.json(
        { error: "Credenciais inválidas." },
        { status: 401 }
      );
    }

    // Gerar JWT Session
    const sessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
      organizationId: user.organizationId,
      organizationName: user.organization.name,
      organizationSlug: user.organization.slug,
    };

    const token = signToken(sessionUser);

    // Gravar log de auditoria
    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: "AUTH_LOGIN_SUCCESS",
        entity: "USER",
        entityId: user.id,
        details: JSON.stringify({ email: user.email }),
      },
    }).catch(() => {});

    apiLogger.info("LOGIN_SUCCESS", { userId: user.id, email: user.email }, {
      organizationId: user.organizationId,
      userId: user.id,
    });

    // Retornar resposta com Cookie HttpOnly
    const response = NextResponse.json({
      success: true,
      user: sessionUser,
      token,
    });

    const isProd = process.env.NODE_ENV === "production";
    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 dias
    });

    return response;
  } catch (error: any) {
    apiLogger.error("LOGIN_ERROR", error);
    return NextResponse.json(
      { error: "Erro interno no servidor de autenticação." },
      { status: 500 }
    );
  }
}
