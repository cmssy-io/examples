import { afterEach, describe, expect, it, vi } from "vitest";
import {
  escapeHtml,
  idempotencyKey,
  isAllowed,
  parseAllowlist,
  resendConfig,
  sendWithResend,
  type ResendConfig,
} from "./mailer";

const CONFIG: ResendConfig = {
  apiKey: "re_test",
  from: "MACHTEC demo shop <shop@demo.cmssy.com>",
  allowlist: [],
};

const MAIL = {
  to: "buyer@example.com",
  subject: "Your order #42 is confirmed",
  text: "Thank you.",
  html: "<p>Thank you.</p>",
};

function resendReply(status: number, body: object = {}) {
  return vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

describe("allowlist", () => {
  const list = parseAllowlist(" Ops@Shop.example , @example.com ,, ");

  it("reads addresses and @domain entries, case-insensitive", () => {
    expect(list).toEqual(["ops@shop.example", "@example.com"]);
  });

  it("lets through listed addresses and anyone on a listed domain", () => {
    expect(isAllowed("OPS@shop.example", list)).toBe(true);
    expect(isAllowed("buyer@example.com", list)).toBe(true);
  });

  it("stops everyone else, including look-alike domains", () => {
    expect(isAllowed("other@shop.example", list)).toBe(false);
    expect(isAllowed("buyer@evil-example.com", list)).toBe(false);
    expect(isAllowed("buyer@mail.example.com", list)).toBe(false);
  });

  it("lets everyone through when no list is set", () => {
    expect(isAllowed("anyone@anywhere.example", [])).toBe(true);
  });
});

describe("resendConfig", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is off without a key or without a sender", () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("MAIL_FROM", CONFIG.from);
    expect(resendConfig()).toBeNull();
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("MAIL_FROM", " ");
    expect(resendConfig()).toBeNull();
  });

  it("carries the allowlist", () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("MAIL_FROM", CONFIG.from);
    vi.stubEnv("MAIL_ALLOWLIST", "@example.com");
    expect(resendConfig()).toEqual({ ...CONFIG, allowlist: ["@example.com"] });
  });
});

describe("idempotencyKey", () => {
  it("is the event name and the delivery id, the same on every retry", () => {
    const delivery = { id: "3f1c-uuid", event: "order.created" };
    expect(idempotencyKey(delivery)).toBe("order.created/3f1c-uuid");
    expect(idempotencyKey({ ...delivery })).toBe(idempotencyKey(delivery));
    expect(idempotencyKey({ ...delivery, id: "other" })).not.toBe(
      idempotencyKey(delivery),
    );
  });
});

describe("escapeHtml", () => {
  it("escapes markup and attribute quotes", () => {
    expect(escapeHtml(`<a href="x">Tom & Jerry's</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;",
    );
  });
});

describe("sendWithResend", () => {
  afterEach(() => vi.restoreAllMocks());

  it("posts the mail to Resend under the idempotency key", async () => {
    const fetchMock = resendReply(200, { id: "email-1" });
    const outcome = await sendWithResend(
      MAIL,
      "order.created/d1",
      CONFIG,
      fetchMock,
    );
    expect(outcome).toBe("sent");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({
      authorization: "Bearer re_test",
      "content-type": "application/json",
      "idempotency-key": "order.created/d1",
    });
    expect(JSON.parse(init.body)).toEqual({
      from: CONFIG.from,
      to: ["buyer@example.com"],
      subject: MAIL.subject,
      text: MAIL.text,
      html: MAIL.html,
    });
  });

  it("skips a recipient off the allowlist without calling Resend", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const fetchMock = resendReply(200);
    const outcome = await sendWithResend(
      MAIL,
      "k",
      { ...CONFIG, allowlist: ["@shop.example"] },
      fetchMock,
    );
    expect(outcome).toBe("not_allowed");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends to a recipient on the allowlist", async () => {
    const fetchMock = resendReply(200);
    const outcome = await sendWithResend(
      MAIL,
      "k",
      { ...CONFIG, allowlist: ["@example.com"] },
      fetchMock,
    );
    expect(outcome).toBe("sent");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("treats a key Resend already used as already sent", async () => {
    const fetchMock = resendReply(409, { name: "invalid_idempotent_request" });
    await expect(sendWithResend(MAIL, "k", CONFIG, fetchMock)).resolves.toBe(
      "duplicate",
    );
  });

  it("fails while the same key is still in flight, so cmssy retries", async () => {
    const fetchMock = resendReply(409, {
      name: "concurrent_idempotent_requests",
    });
    await expect(sendWithResend(MAIL, "k", CONFIG, fetchMock)).rejects.toThrow(
      "409",
    );
  });

  it("fails when Resend refuses", async () => {
    const fetchMock = resendReply(422, { name: "validation_error" });
    await expect(sendWithResend(MAIL, "k", CONFIG, fetchMock)).rejects.toThrow(
      "422",
    );
  });
});
