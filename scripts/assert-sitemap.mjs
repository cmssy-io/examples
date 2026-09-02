/**
 * Asks a running example whether its sitemap points at URLs it can serve.
 *
 * A sitemap is the one document an example publishes about itself, and nothing
 * in a build reads it. `remix-storefront` listed one URL per page while the app
 * served a URL per locale, and it was written that way on purpose: emitting
 * locale URLs the app could not route would have been worse than omitting them.
 * Both halves of that trade are invisible to a compiler.
 *
 * Mostly self-checking, rather than a list of expected URLs that would only
 * restate the workspace's page tree and go stale with it:
 *
 *  - every <loc> must answer 200, so a sitemap cannot advertise a route the
 *    app does not have;
 *  - every hreflang alternate must itself appear as a <loc>, so the alternates
 *    and the entries cannot disagree about which URLs exist;
 *  - the set of hreflang values must be the same on every entry, because a
 *    page that lists one language and its neighbour another is a bug in the
 *    loop that built them, not an editorial choice.
 *
 * Those three cannot notice a sitemap that is merely too small - drop the
 * locale loop and its alternates together and everything left is consistent.
 * So the paths the example already declares in `assertRender` are passed in as
 * `must-list`: a URL good enough to assert is a URL worth publishing, and it is
 * the one statement about coverage that is not the sitemap grading itself.
 *
 * Usage: node scripts/assert-sitemap.mjs <baseUrl> <path> [...must-list]
 */

const [baseUrl, path = "/sitemap.xml", ...mustList] = process.argv.slice(2);

if (!baseUrl) {
  console.error(
    "usage: node scripts/assert-sitemap.mjs <baseUrl> <path> [...must-list]",
  );
  process.exit(1);
}

const LOC = /<loc>([^<]*)<\/loc>/g;
const ALTERNATE = /hreflang="([^"]*)"\s+href="([^"]*)"/g;
const ENTRY = /<url>([\s\S]*?)<\/url>/g;
const MAX_FETCHED = 60;

const failures = [];
const sitemapUrl = new URL(path, baseUrl).toString();

const res = await fetch(sitemapUrl, { redirect: "follow" });
if (!res.ok) {
  console.error(`\nSitemap assertion FAILED:\n  - ${path}: HTTP ${res.status}`);
  process.exit(1);
}

const xml = await res.text();
const entries = [...xml.matchAll(ENTRY)].map((match) => match[1]);
const locations = [...xml.matchAll(LOC)].map((match) => match[1]);

if (entries.length === 0) {
  console.error(`\nSitemap assertion FAILED:\n  - ${path}: no <url> entries`);
  process.exit(1);
}

const known = new Set(locations);

for (const entry of entries) {
  const loc = entry.match(/<loc>([^<]*)<\/loc>/)?.[1];
  for (const [, hreflang, href] of entry.matchAll(ALTERNATE)) {
    if (!known.has(href)) {
      failures.push(
        `${loc}: alternate ${hreflang} points at ${href}, which the sitemap does not list as a URL of its own`,
      );
    }
  }
}

const langSets = entries.map((entry) =>
  [...entry.matchAll(ALTERNATE)].map(([, hreflang]) => hreflang).join(","),
);
const distinct = [...new Set(langSets)];
if (distinct.length > 1) {
  failures.push(
    `entries disagree about which languages exist: ${distinct
      .map((set) => `[${set || "none"}]`)
      .join(" vs ")}`,
  );
}

const listedPaths = new Set(
  locations.map((loc) => {
    try {
      return new URL(loc).pathname;
    } catch {
      return loc;
    }
  }),
);
for (const wanted of mustList) {
  if (!listedPaths.has(wanted)) {
    failures.push(
      `${wanted} renders and is asserted, but the sitemap does not list it`,
    );
  }
}

// Cheap on these examples and bounded for the day one of them is not: the point
// is that a listed URL is a served URL, and a sample would let the untested one
// be the broken one.
const fetched = locations.slice(0, MAX_FETCHED);
const statuses = await Promise.all(
  fetched.map(async (loc) => {
    const probe = new URL(new URL(loc).pathname, baseUrl).toString();
    try {
      const response = await fetch(probe, { redirect: "follow" });
      await response.body?.cancel();
      return { loc, status: response.status };
    } catch (error) {
      return { loc, status: `request failed - ${error.message}` };
    }
  }),
);

for (const { loc, status } of statuses) {
  if (status !== 200)
    failures.push(`${loc}: listed in the sitemap, HTTP ${status}`);
}

if (failures.length > 0) {
  console.error("\nSitemap assertion FAILED:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  `  ${path}: ${entries.length} urls, ${fetched.length} fetched, languages [${distinct[0] || "none"}]`,
);
console.log("Sitemap assertion passed.");
