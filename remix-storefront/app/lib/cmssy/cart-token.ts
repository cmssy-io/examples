export const CART_COOKIE = "cmssy_cart";

const CART_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const CART_TOKEN_BYTES = 32;
const CART_TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,128}$/;

export function cartCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: CART_COOKIE_MAX_AGE_SECONDS,
    secure,
  };
}

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function requestIsSecure(url: URL, headers: Headers): boolean {
  return (
    url.protocol === "https:" || headers.get("x-forwarded-proto") === "https"
  );
}

export function mintCartToken(): string {
  const bytes = new Uint8Array(CART_TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

export function isCartToken(value: string): boolean {
  return CART_TOKEN_PATTERN.test(value);
}
