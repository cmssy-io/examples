import type { CmssyWebhookAccountEvent } from "@cmssy/core";
import { siteUrl } from "@/lib/site-url";

export type AccountMailEvent = CmssyWebhookAccountEvent["event"];

export interface AccountMail {
  to: string;
  subject: string;
  text: string;
  link: string;
  event: AccountMailEvent;
}

export interface AccountMailSender {
  send(mail: AccountMail): Promise<void>;
}

const ACCOUNT_MAILS: Record<
  AccountMailEvent,
  { path: string; subject: string; intro: string }
> = {
  "account.verification_requested": {
    path: "/verify-email",
    subject: "Verify your email",
    intro: "Confirm this address to finish setting up your account:",
  },
  "account.password_reset_requested": {
    path: "/reset-password",
    subject: "Reset your password",
    intro:
      "Someone asked to reset the password of your account. If it was you, choose a new one here:",
  },
  "account.login_change_requested": {
    path: "/confirm-login-change",
    subject: "Confirm your new login",
    intro: "Confirm to sign in with this login from now on:",
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
  base?: string,
): AccountMail {
  const mail = ACCOUNT_MAILS[event];
  const link = accountLink(event, data.token, base);
  return {
    to: data.login,
    subject: mail.subject,
    text: `${mail.intro}\n\n${link}\n\nThe link works once and expires at ${data.expiresAt}. If you did not ask for this, ignore this email.`,
    link,
    event,
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
  const url = process.env.ACCOUNT_MAIL_WEBHOOK_URL?.trim();
  return url ? webhookSender(url) : consoleSender;
}
