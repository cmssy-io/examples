import type { CmssyWebhookAccountEvent } from "@cmssy/core";
import {
  escapeHtml,
  resendConfig,
  sendWithResend,
  type ResendConfig,
} from "@/lib/mailer";
import {
  button,
  paragraph,
  renderMail,
  smallText,
  type Brand,
} from "@/lib/mail-layout";
import { siteUrl } from "@/lib/site-url";

export type AccountMailEvent = CmssyWebhookAccountEvent["event"];

export interface AccountMail {
  to: string;
  subject: string;
  text: string;
  html: string;
  link: string;
  event: AccountMailEvent;
}

export interface AccountMailSender {
  send(mail: AccountMail, idempotencyKey: string): Promise<void>;
}

const ACCOUNT_MAILS: Record<
  AccountMailEvent,
  { path: string; subject: string; intro: string; action: string }
> = {
  "account.verification_requested": {
    path: "/verify-email",
    subject: "Verify your email",
    intro: "Confirm this address to finish setting up your account:",
    action: "Verify email",
  },
  "account.password_reset_requested": {
    path: "/reset-password",
    subject: "Reset your password",
    intro:
      "Someone asked to reset the password of your account. If it was you, choose a new one here:",
    action: "Choose a new password",
  },
  "account.login_change_requested": {
    path: "/confirm-login-change",
    subject: "Confirm your new login",
    intro: "Confirm to sign in with this login from now on:",
    action: "Confirm new login",
  },
};

export function isAccountEvent(event: string): event is AccountMailEvent {
  return Object.hasOwn(ACCOUNT_MAILS, event);
}

export function accountLink(
  event: AccountMailEvent,
  token: string,
  base: string = siteUrl(),
): string {
  const url = new URL(ACCOUNT_MAILS[event].path, `${base}/`);
  url.searchParams.set("token", token);
  return url.toString();
}

export function accountMail(
  { event, data }: Pick<CmssyWebhookAccountEvent, "event" | "data">,
  brand: Brand,
): AccountMail {
  const mail = ACCOUNT_MAILS[event];
  const link = accountLink(event, data.token, brand.siteUrl);
  const outro = `The link works once and expires at ${data.expiresAt}. If you did not ask for this, ignore this email.`;
  const body = [
    paragraph(mail.intro),
    button(mail.action, link),
    smallText(
      `If the button does not work, copy this link into your browser:<br><a href="${escapeHtml(link)}" style="color:#6b7280;word-break:break-all;">${escapeHtml(link)}</a>`,
    ),
    smallText(escapeHtml(outro)),
  ].join("\n");
  return {
    to: data.login,
    subject: mail.subject,
    text: `${mail.intro}\n\n${link}\n\n${outro}`,
    html: renderMail({
      brand,
      preheader: mail.intro.replace(/:$/, "."),
      heading: mail.subject,
      body,
      reason: `You received this email because this address was used for an account at ${brand.name}.`,
    }),
    link,
    event,
  };
}

function resendSender(config: ResendConfig): AccountMailSender {
  return {
    async send(mail, idempotencyKey) {
      await sendWithResend(
        { to: mail.to, subject: mail.subject, text: mail.text, html: mail.html },
        idempotencyKey,
        config,
      );
    },
  };
}

const consoleSender: AccountMailSender = {
  async send(mail) {
    console.info("account mail", mail);
  },
};

function webhookSender(url: string): AccountMailSender {
  return {
    async send(mail) {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mail),
      });
      if (!response.ok) {
        throw new Error(`account mail not sent (${response.status})`);
      }
    },
  };
}

export function accountMailSender(): AccountMailSender {
  const resend = resendConfig();
  if (resend) return resendSender(resend);
  const url = process.env.ACCOUNT_MAIL_WEBHOOK_URL?.trim();
  return url ? webhookSender(url) : consoleSender;
}
