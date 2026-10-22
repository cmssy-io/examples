import { describe, expect, it } from "vitest";
import { SHOP_CHANNELS, channelEntryPath, findChannel } from "./channel";

describe("findChannel", () => {
  it("returns the configured channel for a known key", () => {
    expect(findChannel("distributor")).toMatchObject({
      key: "distributor",
      name: "Distributors & Resellers",
      priceAccess: "COMPANY_MEMBERS",
    });
  });

  it("returns null for a key the storefront does not offer", () => {
    expect(findChannel("horeca")).toBeNull();
    expect(findChannel("exit")).toBeNull();
  });

  it("returns null without a key", () => {
    expect(findChannel(undefined)).toBeNull();
    expect(findChannel("")).toBeNull();
  });

  it("matches the key exactly", () => {
    expect(findChannel("Workshop")).toBeNull();
    expect(findChannel(" plant")).toBeNull();
  });
});

describe("SHOP_CHANNELS", () => {
  it("offers the four demo channels with unique keys", () => {
    const keys = SHOP_CHANNELS.map((channel) => channel.key);
    expect(keys).toEqual(["workshop", "distributor", "plant", "express"]);
  });

  it("prices express gross and the trade channels net", () => {
    expect(findChannel("express")?.displayMode).toBe("gross");
    expect(findChannel("plant")?.displayMode).toBe("net");
  });
});

describe("channelEntryPath", () => {
  it("links to the channel's entry route", () => {
    expect(channelEntryPath(findChannel("plant")!)).toBe("/channel/plant");
  });
});
