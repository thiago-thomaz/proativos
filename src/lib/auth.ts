import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { SessionUser, UserRole } from "./types";

const JWT_SECRET = process.env.JWT_SECRET || "ple_fallback_jwt_secret_dev_398239";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: SessionUser): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): SessionUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionUser;
  } catch {
    return null;
  }
}

export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  // 1. Check Authorization Bearer Header
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    return verifyToken(token);
  }

  // 2. Check Cookie (auth_token)
  const tokenCookie = req.cookies.get("auth_token");
  if (tokenCookie?.value) {
    return verifyToken(tokenCookie.value);
  }

  // 3. Fallback: If in dev and no session, load default demo owner
  if (process.env.NODE_ENV === "development") {
    const defaultUser = await prisma.user.findFirst({
      include: { organization: true },
    });
    if (defaultUser) {
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

  return (roleHierarchy[userRole] || 0) >= (roleHierarchy[requiredRole] || 0);
}
