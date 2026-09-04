import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken } from "@/lib/auth";
import { UserRole } from "@/lib/types";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:auth:register");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, orgName, email, password } = body;

    if (!name || !orgName || !email || !password) {
      apiLogger.warn("REGISTER_FAILED_MISSING_FIELDS");
      return NextResponse.json(
        { error: "Nome, nome da empresa, e-mail e senha são obrigatórios." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      apiLogger.warn("REGISTER_FAILED_SHORT_PASSWORD");
      return NextResponse.json(
        { error: "A senha deve conter no mínimo 6 caracteres." },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // Verificar se e-mail já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      apiLogger.warn("REGISTER_FAILED_DUPLICATE_EMAIL", { email: cleanEmail });
      return NextResponse.json(
        { error: "Já existe uma conta registrada com este e-mail." },
        { status: 409 }
      );
    }

    // Gerar slug único para organização
    let baseSlug = orgName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 30);

    if (!baseSlug || baseSlug === "-") baseSlug = "org";
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Criar Organização + Usuário + Conta de Crédito em Transação
    const passwordHash = await hashPassword(password);

    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: orgName.trim(),
          slug,
          plan: "STARTER",
          active: true,
        },
      });

      const user = await tx.user.create({
        data: {
          organizationId: org.id,
          name: name.trim(),
          email: cleanEmail,
          passwordHash,
          role: "OWNER",
          active: true,
        },
      });

      // Conta de Créditos Inicial (100 créditos bônus para novos cadastros)
      const creditAccount = await tx.creditAccount.create({
        data: {
          organizationId: org.id,
          balance: 100,
        },
      });

      await tx.creditTransaction.create({
        data: {
          accountId: creditAccount.id,
          amount: 100,
          type: "CREDIT_RECHARGE",
          description: "Bônus de boas-vindas para nova organização",
        },
      });

      // Template inicial de abordagem
      await tx.template.create({
        data: {
          organizationId: org.id,
          name: "Abordagem Inicial Padrão",
          channel: "EMAIL",
          subject: "Oportunidade para a {{nome_fantasia}}",
          body: "Olá, {{nome_contato}}!\n\nParabéns pela recente abertura da {{nome_fantasia}} em {{cidade}}/{{uf}}.\n\nGostaria de apresentar condições especiais do nosso {{produto}}.\n\nPara cancelar o recebimento, responda 'Parar'.",
        },
      });

      return { org, user };
    });

    const sessionUser = {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: result.user.role as UserRole,
      organizationId: result.org.id,
      organizationName: result.org.name,
      organizationSlug: result.org.slug,
    };

    const token = signToken(sessionUser);

    apiLogger.info("REGISTER_SUCCESS", {
      userId: result.user.id,
      organizationId: result.org.id,
      email: result.user.email,
    }, {
      organizationId: result.org.id,
      userId: result.user.id,
    });

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
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    apiLogger.error("REGISTER_ERROR", error);
    return NextResponse.json(
      { error: "Erro ao registrar usuário: " + String(error.message || error) },
      { status: 500 }
    );
  }
}
