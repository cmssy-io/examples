import { CART_COOKIE } from "./session-crypto";

export { CART_COOKIE };

const CART_TOKEN_BYTES = 32;

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function mintCartToken(): string {
  const bytes = new Uint8Array(CART_TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

const CART_TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,128}$/;

export function isCartToken(value: string): boolean {
  return CART_TOKEN_PATTERN.test(value);
}
