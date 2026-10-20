import { afterEach, describe, expect, it, vi } from "vitest";
import {
  accountLink,
  accountMail,
  accountMailSender,
  isAccountEvent,
} from "./account-mail";

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
      "https://shop.example",
    );
    expect(mail).toMatchObject({
      to: "new@shop.example",
      link: "https://shop.example/confirm-login-change?token=a%2Bb%2Fc%3D",
      event: "account.login_change_requested",
    });
    expect(mail.text).toContain(mail.link);
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
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const mail = accountMail(
    { event: "account.verification_requested", data: REQUEST },
    "https://shop.example",
  );

  it("logs the mail when no mail webhook is set", async () => {
    vi.stubEnv("ACCOUNT_MAIL_WEBHOOK_URL", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    await accountMailSender().send(mail);
    expect(info).toHaveBeenCalledWith("account mail", mail);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the mail to the mail webhook when one is set", async () => {
    vi.stubEnv("ACCOUNT_MAIL_WEBHOOK_URL", "https://mailer.example/send");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null));
    vi.stubGlobal("fetch", fetchMock);
    await accountMailSender().send(mail);
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
    await expect(accountMailSender().send(mail)).rejects.toThrow("502");
  });
});
