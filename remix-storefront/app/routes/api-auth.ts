import { data } from "react-router";
import { toSessionPayload } from "../lib/cmssy/access-claims";
import type { SessionUser } from "../lib/cmssy/session-crypto";
import * as authService from "../services/auth";
import {
  clearCartToken,
  clearSession,
  shopContext,
  writeSession,
} from "../shop/context";
import type { Route } from "./+types/api-auth";

export interface AuthActionResult {
  ok: boolean;
  message?: string;
  user?: SessionUser;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function loader() {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { allow: "POST" },
  });
}

export async function action({ request, context }: Route.ActionArgs) {
  const shop = context.get(shopContext);
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  switch (body.intent) {
    case "signIn": {
      const result = await authService.signIn(
        text(body.identity),
        text(body.password),
      );
      const payload = toSessionPayload(result);
      if (!payload) {
        return { ok: false, message: result.message || "Sign in failed." };
      }
      await writeSession(shop, payload);
      return { ok: true, user: payload.user };
    }
    case "register": {
      const fields =
        body.fields && typeof body.fields === "object"
          ? (body.fields as Record<string, unknown>)
          : {};
      const result = await authService.register(
        text(body.identity),
        text(body.password),
        fields,
      );
      return { ok: result.success, message: result.message };
    }
    case "signOut": {
      const session = shop.session;
      if (session) {
        await authService.signOut(session.refreshToken).catch(() => undefined);
      }
      clearSession(shop);
      clearCartToken(shop);
      return { ok: true };
    }
    default:
      return data({ ok: false, message: "Unknown auth intent" }, { status: 400 });
  }
}
