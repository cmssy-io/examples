import { describe, expect, it, vi } from "vitest";
import { createClient } from "./cmssy.js";

const config = { apiUrl: "https://api.test/graphql", token: "cs_test", workspaceId: "ws1" };

function reply(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers });
}

describe("createClient", () => {
  it("sends the token and the workspace", async () => {
    const send = vi.fn(async () => reply(200, { data: { ok: true } }));
    const client = createClient(config, async () => {}, send);

    await client.request("query { ok }");

    expect(send).toHaveBeenCalledWith(
      "https://api.test/graphql",
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer cs_test",
          "x-workspace-id": "ws1",
        }),
      }),
    );
  });

  it("waits as long as Retry-After says and tries again", async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce(reply(429, { errors: [{ message: "slow down" }] }, { "retry-after": "7" }))
      .mockResolvedValueOnce(reply(200, { data: { ok: 1 } }));
    const sleep = vi.fn(async () => {});
    const client = createClient(config, sleep, send);

    await expect(client.request("query { ok }")).resolves.toEqual({ ok: 1 });
    expect(sleep).toHaveBeenCalledWith(7000);
    expect(client.stats).toEqual({ calls: 2, throttled: 1, waitedMs: 7000 });
  });

  it("gives up after five attempts and reports the refusal", async () => {
    const send = vi.fn(async () =>
      reply(429, { errors: [{ message: "Record write limit reached" }] }, { "retry-after": "1" }),
    );
    const client = createClient(config, async () => {}, send);

    await expect(client.request("mutation { x }")).rejects.toThrow("Record write limit reached");
    expect(send).toHaveBeenCalledTimes(5);
  });

  it("raises GraphQL errors instead of returning partial data", async () => {
    const send = vi.fn(async () =>
      reply(200, { data: null, errors: [{ message: "a" }, { message: "b" }] }),
    );
    const client = createClient(config, async () => {}, send);

    await expect(client.request("query { x }")).rejects.toThrow("a; b");
  });
});
