import type { SessionPayload, SessionUser } from "@/lib/cmssy/session-crypto";

export interface AuthTokenResult {
  success: boolean;
  message: string;
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenExpiresIn: number | null;
}

export function decodeAccessClaims(accessToken: string): SessionUser | null {
  const parts = accessToken.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder().decode(bytes)) as Record<
      string,
      unknown
    >;
    if (
      claims.type !== "site_member" ||
      typeof claims.recordId !== "string" ||
      typeof claims.email !== "string"
    ) {
      return null;
    }
    return { recordId: claims.recordId, email: claims.email };
  } catch {
    return null;
  }
}

export function toSessionPayload(
  result: AuthTokenResult,
): SessionPayload | null {
  if (
    !result.success ||
    !result.accessToken ||
    !result.refreshToken ||
    !result.accessTokenExpiresIn
  ) {
    return null;
  }
  const user = decodeAccessClaims(result.accessToken);
  if (!user) return null;
  return {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    accessExpiresAt: Date.now() + result.accessTokenExpiresIn * 1000,
    user,
  };
}
