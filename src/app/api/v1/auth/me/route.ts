import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppLogger } from "@/lib/logger";

const apiLogger = new AppLogger("api:auth:me");

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      apiLogger.debug("AUTH_ME_UNAUTHENTICATED");
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
      apiLogger.warn("AUTH_ME_USER_NOT_FOUND_OR_INACTIVE", { userId: session.id });
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    apiLogger.debug("AUTH_ME_SUCCESS", { userId: dbUser.id, organizationId: dbUser.organizationId });

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
    apiLogger.error("AUTH_ME_ERROR", error);
    return NextResponse.json({ error: "Erro ao obter sessão." }, { status: 500 });
  }
}
