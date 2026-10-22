const RESEND_URL = "https://api.resend.com/emails";
const DUPLICATE_REQUEST = "invalid_idempotent_request";

export interface OutgoingMail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface ResendConfig {
  apiKey: string;
  from: string;
  allowlist: string[];
}

export type MailOutcome = "sent" | "duplicate" | "not_allowed";

export function parseAllowlist(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowed(to: string, allowlist: readonly string[]): boolean {
  if (allowlist.length === 0) return true;
  const address = to.trim().toLowerCase();
  return allowlist.some((entry) =>
    entry.startsWith("@") ? address.endsWith(entry) : address === entry,
  );
}

export function resendConfig(): ResendConfig | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.MAIL_FROM?.trim();
  if (!apiKey || !from) return null;
  return {
    apiKey,
    from,
    allowlist: parseAllowlist(process.env.MAIL_ALLOWLIST),
  };
}

export function idempotencyKey(event: { id: string; event: string }): string {
  return `${event.event}/${event.id}`;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendWithResend(
  mail: OutgoingMail,
  key: string,
  config: ResendConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<MailOutcome> {
  if (!isAllowed(mail.to, config.allowlist)) {
    console.info("mail skipped: recipient is not on MAIL_ALLOWLIST", {
      to: mail.to,
      subject: mail.subject,
    });
    return "not_allowed";
  }
  const response = await fetchImpl(RESEND_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json",
      "idempotency-key": key,
    },
    body: JSON.stringify({
      from: config.from,
      to: [mail.to],
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    }),
  });
  if (response.ok) return "sent";
  if (response.status === 409) {
    const body = (await response.json().catch(() => null)) as {
      name?: string;
    } | null;
    if (body?.name === DUPLICATE_REQUEST) return "duplicate";
  }
  throw new Error(`mail not sent by Resend (${response.status})`);
}
