import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { SessionUser, UserRole } from "./types";
import { AppLogger } from "./logger";

const authLogger = new AppLogger("auth");
const JWT_SECRET = process.env.JWT_SECRET || "ple_fallback_jwt_secret_dev_398239";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: SessionUser): string {
  authLogger.debug("TOKEN_SIGNED", { userId: payload.id, organizationId: payload.organizationId, role: payload.role });
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): SessionUser | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as SessionUser;
    return payload;
  } catch (err) {
    authLogger.debug("TOKEN_VERIFY_FAILED", { error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  // 1. Check Authorization Bearer Header
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const user = verifyToken(token);
    if (user) {
      authLogger.debug("SESSION_RESOLVED_BEARER", { userId: user.id, organizationId: user.organizationId });
      return user;
    }
  }

  // 2. Check Cookie (auth_token)
  const tokenCookie = req.cookies.get("auth_token");
  if (tokenCookie?.value) {
    const user = verifyToken(tokenCookie.value);
    if (user) {
      authLogger.debug("SESSION_RESOLVED_COOKIE", { userId: user.id, organizationId: user.organizationId });
      return user;
    }
  }

  // 3. Fallback: If in dev and no session, load default demo owner
  if (process.env.NODE_ENV === "development") {
    const defaultUser = await prisma.user.findFirst({
      include: { organization: true },
    });
    if (defaultUser) {
      authLogger.debug("SESSION_RESOLVED_DEV_FALLBACK", { userId: defaultUser.id, organizationId: defaultUser.organizationId });
      return {
        id: defaultUser.id,
        name: defaultUser.name,
        email: defaultUser.email,
        role: defaultUser.role as UserRole,
        organizationId: defaultUser.organizationId,
        organizationName: defaultUser.organization.name,
        organizationSlug: defaultUser.organization.slug,
      };
    }
  }

  return null;
}

export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    SUPER_ADMIN: 4,
    OWNER: 3,
    ADMIN: 2,
    OPERATOR: 1,
  };

  const allowed = (roleHierarchy[userRole] || 0) >= (roleHierarchy[requiredRole] || 0);
  if (!allowed) {
    authLogger.warn("PERMISSION_DENIED", { userRole, requiredRole });
  }
  return allowed;
}
