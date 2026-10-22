import { escapeHtml } from "@/lib/mailer";
import { localizedText } from "@/lib/localized";

export const MAIL_LOCALE = "en";

export interface Brand {
  name: string;
  logoUrl: string | null;
  siteUrl: string;
}

export interface BrandSource {
  siteName: unknown;
  defaultLanguage: string | null;
  branding: { brandName?: string | null; logoUrl?: string | null } | null;
}

export interface MailLayout {
  brand: Brand;
  preheader: string;
  heading: string;
  body: string;
  reason: string;
}

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const INK = "#111827";
const MUTED = "#6b7280";
const LINE = "#e5e7eb";
const PAGE = "#f3f4f6";
const PANEL = "#f9fafb";
const ACCENT = "#111827";

export function safeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function displayName(from: string | undefined): string | null {
  const match = from?.match(/^\s*"?([^"<]*?)"?\s*</);
  return match?.[1]?.trim() || null;
}

export function brandFrom(
  source: BrandSource | null,
  { mailFrom, siteUrl }: { mailFrom?: string; siteUrl: string },
): Brand {
  const configured =
    source?.branding?.brandName?.trim() ||
    localizedText(source?.siteName, {
      defaultLocale: source?.defaultLanguage,
    });
  return {
    name: configured || displayName(mailFrom) || new URL(siteUrl).hostname,
    logoUrl: safeUrl(source?.branding?.logoUrl),
    siteUrl,
  };
}

export function paragraph(text: string, style = ""): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:${INK};${style}">${escapeHtml(text)}</p>`;
}

export function smallText(html: string): string {
  return `<p style="margin:0 0 12px;font-size:12px;line-height:18px;color:${MUTED};">${html}</p>`;
}

export function button(label: string, href: string): string {
  const url = escapeHtml(href);
  return [
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">',
    "<tr>",
    `<td align="center" bgcolor="${ACCENT}" style="border-radius:6px;background:${ACCENT};">`,
    `<a href="${url}" target="_blank" style="display:inline-block;padding:12px 24px;font-family:${FONT};font-size:15px;font-weight:600;line-height:20px;color:#ffffff;text-decoration:none;border-radius:6px;">${escapeHtml(label)}</a>`,
    "</td>",
    "</tr>",
    "</table>",
  ].join("");
}

export function panel(html: string): string {
  return [
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">',
    `<tr><td style="padding:16px;background:${PANEL};border:1px solid ${LINE};border-radius:6px;font-size:14px;line-height:22px;color:${INK};">${html}</td></tr>`,
    "</table>",
  ].join("");
}

export function details(rows: [label: string, value: string][]): string {
  return panel(
    rows
      .map(
        ([label, value]) =>
          `<span style="color:${MUTED};">${escapeHtml(label)}</span><br><strong>${escapeHtml(value)}</strong>`,
      )
      .join("<br><br>"),
  );
}

function header(brand: Brand): string {
  const name = escapeHtml(brand.name);
  const site = escapeHtml(brand.siteUrl);
  const mark = brand.logoUrl
    ? `<img src="${escapeHtml(brand.logoUrl)}" alt="${name}" height="32" style="display:block;height:32px;width:auto;border:0;outline:none;text-decoration:none;">`
    : `<span style="font-size:20px;font-weight:700;line-height:28px;color:${INK};">${name}</span>`;
  return `<a href="${site}" target="_blank" style="text-decoration:none;color:${INK};">${mark}</a>`;
}

export function renderMail({
  brand,
  preheader,
  heading,
  body,
  reason,
}: MailLayout): string {
  const name = escapeHtml(brand.name);
  return [
    "<!doctype html>",
    `<html lang="${MAIL_LOCALE}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="color-scheme" content="light">',
    '<meta name="supported-color-schemes" content="light">',
    `<title>${escapeHtml(heading)}</title>`,
    "</head>",
    `<body style="margin:0;padding:0;background:${PAGE};">`,
    `<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${PAGE};">${escapeHtml(preheader)}</div>`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PAGE}" style="background:${PAGE};">`,
    '<tr><td align="center" style="padding:32px 16px;">',
    `<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;font-family:${FONT};">`,
    `<tr><td style="padding:0 8px 20px;">${header(brand)}</td></tr>`,
    `<tr><td bgcolor="#ffffff" style="background:#ffffff;border:1px solid ${LINE};border-radius:8px;padding:32px;">`,
    `<h1 style="margin:0 0 16px;font-size:22px;line-height:30px;font-weight:700;color:${INK};">${escapeHtml(heading)}</h1>`,
    body,
    "</td></tr>",
    `<tr><td style="padding:20px 8px 0;font-size:12px;line-height:18px;color:${MUTED};">`,
    `<p style="margin:0 0 4px;font-weight:600;color:${INK};">${name}</p>`,
    `<p style="margin:0;">${escapeHtml(reason)}</p>`,
    "</td></tr>",
    "</table>",
    "</td></tr>",
    "</table>",
    "</body>",
    "</html>",
  ].join("\n");
}
