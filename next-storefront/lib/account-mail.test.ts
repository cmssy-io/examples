import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  accountLink,
  accountMail,
  accountMailSender,
  isAccountEvent,
} from "./account-mail";
import type { Brand } from "./mail-layout";

const BRAND: Brand = {
  name: "Northwind Parts",
  logoUrl: null,
  siteUrl: "https://shop.example",
};

const REQUEST = {
  workspaceId: "w1",
  modelSlug: "shopmember",
  recordId: "m1",
  login: "new@shop.example",
  previousLogin: "old@shop.example",
  token: "a+b/c=",
  expiresAt: "2026-10-02T00:00:00.000Z",
};

describe("accountLink", () => {
  it("points each event at its own page on the site", () => {
    const base = "https://shop.example";
    expect(accountLink("account.verification_requested", "t", base)).toBe(
      "https://shop.example/verify-email?token=t",
    );
    expect(accountLink("account.password_reset_requested", "t", base)).toBe(
      "https://shop.example/reset-password?token=t",
    );
    expect(accountLink("account.login_change_requested", "t", base)).toBe(
      "https://shop.example/confirm-login-change?token=t",
    );
  });

  it("encodes the token so it survives the query string", () => {
    const link = accountLink(
      "account.password_reset_requested",
      REQUEST.token,
      "https://shop.example",
    );
    expect(new URL(link).searchParams.get("token")).toBe(REQUEST.token);
  });

  it("builds on the site's own origin", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://parts.example/");
    expect(accountLink("account.verification_requested", "t")).toBe(
      "https://parts.example/verify-email?token=t",
    );
    vi.unstubAllEnvs();
  });
});

describe("accountMail", () => {
  it("writes a login change to the new login", () => {
    const mail = accountMail(
      { event: "account.login_change_requested", data: REQUEST },
      BRAND,
    );
    expect(mail).toMatchObject({
      to: "new@shop.example",
      link: "https://shop.example/confirm-login-change?token=a%2Bb%2Fc%3D",
      event: "account.login_change_requested",
    });
    expect(mail.text).toContain(mail.link);
    expect(mail.html).toContain(`href="${mail.link}"`);
  });

  it("builds the link on the brand's site", () => {
    const mail = accountMail(
      { event: "account.verification_requested", data: REQUEST },
      { ...BRAND, siteUrl: "https://parts.example" },
    );
    expect(mail.link).toBe(
      "https://parts.example/verify-email?token=a%2Bb%2Fc%3D",
    );
  });

  it("gives one action button, the raw link as a fallback and a way out", () => {
    const mail = accountMail(
      {
        event: "account.password_reset_requested",
        data: { ...REQUEST, token: "x&y" },
      },
      BRAND,
    );
    const href = "https://shop.example/reset-password?token=x%26y";
    expect(mail.link).toBe(href);
    expect(mail.html).toMatch(
      /<a href="https:\/\/shop\.example\/reset-password\?token=x%26y" target="_blank"[^>]*>Choose a new password<\/a>/,
    );
    expect(mail.html.match(/>Choose a new password</g)).toHaveLength(1);
    expect(mail.html).toContain(
      `copy this link into your browser:<br><a href="${href}"`,
    );
    expect(mail.html).toContain(`>${href}</a>`);
    expect(mail.html).toContain(
      "If you did not ask for this, ignore this email.",
    );
    expect(mail.html).toContain(">Reset your password</h1>");
    expect(mail.html).toContain("an account at Northwind Parts.");
    expect(mail.text).toBe(
      `Someone asked to reset the password of your account. If it was you, choose a new one here:\n\n${href}\n\nThe link works once and expires at 2026-10-02T00:00:00.000Z. If you did not ask for this, ignore this email.`,
    );
  });
});

describe("isAccountEvent", () => {
  it("knows only the three account requests", () => {
    expect(isAccountEvent("account.verification_requested")).toBe(true);
    expect(isAccountEvent("account.password_reset_requested")).toBe(true);
    expect(isAccountEvent("account.login_change_requested")).toBe(true);
    expect(isAccountEvent("account.deleted")).toBe(false);
    expect(isAccountEvent("order.paid")).toBe(false);
    expect(isAccountEvent("toString")).toBe(false);
  });
});

describe("accountMailSender", () => {
  const KEY = "account.verification_requested/d1";

  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("MAIL_FROM", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const mail = accountMail(
    { event: "account.verification_requested", data: REQUEST },
    BRAND,
  );

  it("logs the mail when no mail webhook is set", async () => {
    vi.stubEnv("ACCOUNT_MAIL_WEBHOOK_URL", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    await accountMailSender().send(mail, KEY);
    expect(info).toHaveBeenCalledWith("account mail", mail);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the mail to the mail webhook when one is set", async () => {
    vi.stubEnv("ACCOUNT_MAIL_WEBHOOK_URL", "https://mailer.example/send");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null));
    vi.stubGlobal("fetch", fetchMock);
    await accountMailSender().send(mail, KEY);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://mailer.example/send",
      expect.objectContaining({ method: "POST", body: JSON.stringify(mail) }),
    );
  });

  it("fails when the mail webhook refuses, so the delivery is retried", async () => {
    vi.stubEnv("ACCOUNT_MAIL_WEBHOOK_URL", "https://mailer.example/send");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 502 })),
    );
    await expect(accountMailSender().send(mail, KEY)).rejects.toThrow("502");
  });

  it("sends through Resend when it is configured, keyed by the delivery", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("MAIL_FROM", "Shop <shop@shop.example>");
    vi.stubEnv("ACCOUNT_MAIL_WEBHOOK_URL", "https://mailer.example/send");
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    await accountMailSender().send(mail, KEY);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers["idempotency-key"]).toBe(KEY);
    expect(JSON.parse(init.body)).toEqual({
      from: "Shop <shop@shop.example>",
      to: [mail.to],
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
  });

  it("keeps the mail webhook when Resend has a key but no sender", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("ACCOUNT_MAIL_WEBHOOK_URL", "https://mailer.example/send");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null));
    vi.stubGlobal("fetch", fetchMock);
    await accountMailSender().send(mail, KEY);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://mailer.example/send",
      expect.anything(),
    );
  });
});
