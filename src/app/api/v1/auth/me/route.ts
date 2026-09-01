import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: session.id },
      include: {
        organization: {
          include: {
            creditAccount: true,
          },
        },
      },
    });

    if (!dbUser || !dbUser.active) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        organizationId: dbUser.organizationId,
        organizationName: dbUser.organization.name,
        organizationSlug: dbUser.organization.slug,
        creditBalance: dbUser.organization.creditAccount?.balance || 0,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao obter sessão." }, { status: 500 });
  }
}
