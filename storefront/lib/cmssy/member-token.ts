import { isAccessExpired, readSession } from "@/lib/cmssy/session";

export async function memberAccessToken(): Promise<string | undefined> {
  const session = await readSession();
  if (!session || isAccessExpired(session)) return undefined;
  return session.accessToken;
}
