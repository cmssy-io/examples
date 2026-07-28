import { EncryptJWT, jwtDecrypt } from "jose";
import { cmssy } from "@/cmssy.config";

export const SESSION_COOKIE = "cmssy_session";
export const CART_COOKIE = "cmssy_cart";

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const MIN_SESSION_SECRET_LENGTH = 32;
const ACCESS_EXPIRY_SKEW_MS = 30_000;

export interface SessionUser {
  recordId: string;
  email: string;
}

export interface SessionPayload {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number;
  user: SessionUser;
}

function sessionSecret(): string {
  const secret = process.env.CMSSY_SESSION_SECRET;
  if (!secret || secret.length < MIN_SESSION_SECRET_LENGTH) {
    throw new Error(
      `CMSSY_SESSION_SECRET must be at least ${MIN_SESSION_SECRET_LENGTH} characters`,
    );
  }
  return secret;
}

async function sessionKey(): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(sessionSecret()),
  );
  return new Uint8Array(digest);
}

function isSessionUser(value: unknown): value is SessionUser {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as SessionUser).recordId === "string" &&
    typeof (value as SessionUser).email === "string"
  );
}

function parseSealedPayload(
  payload: Record<string, unknown>,
): SessionPayload | null {
  const { accessToken, refreshToken, accessExpiresAt, user } = payload;
  if (
    typeof accessToken !== "string" ||
    typeof refreshToken !== "string" ||
    typeof accessExpiresAt !== "number" ||
    !isSessionUser(user)
  ) {
    return null;
  }
  return { accessToken, refreshToken, accessExpiresAt, user };
}

export async function sealSession(payload: SessionPayload): Promise<string> {
  const key = await sessionKey();
  return new EncryptJWT({ ...payload })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .setAudience(cmssy.workspaceSlug)
    .encrypt(key);
}

export async function openSession(
  token: string,
): Promise<SessionPayload | null> {
  const key = await sessionKey();

  try {
    const { payload } = await jwtDecrypt(token, key, {
      keyManagementAlgorithms: ["dir"],
      contentEncryptionAlgorithms: ["A256GCM"],
      audience: cmssy.workspaceSlug,
    });
    return parseSealedPayload(payload);
  } catch {
    return null;
  }
}

export function isAccessExpired(
  payload: SessionPayload,
  now: number = Date.now(),
): boolean {
  return payload.accessExpiresAt <= now + ACCESS_EXPIRY_SKEW_MS;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "lax" as const,
    path: "/" as const,
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
