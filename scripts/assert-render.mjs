/**
 * Asks a running example whether it can render what the workspace sent it.
 *
 * A build proves the app compiles. It says nothing about whether the app knows
 * the blocks its workspace uses - and that failed silently in production for
 * months: two published demos served pages where every block came back as
 * `data-cmssy-unknown-block` with `display:none`, so the HTTP status was 200,
 * the build was green, and the page was blank.
 *
 * The assertion is therefore structural, not textual. It does not look for a
 * headline, because content in the demo workspace is edited by people; it looks
 * for the one thing that must be true of any example worth publishing - every
 * block the CMS sent has a component behind it.
 *
 * The one exception is `lang`, and it is structural too: a locale prefix that
 * does not reach `<html lang>` is a routing bug the block count cannot see -
 * /no answers 200 with the same block structure whether it served Norwegian or
 * fell back to English.
 *
 * Usage: node scripts/assert-render.mjs <baseUrl> <target> [...targets]
 * where a target is a path, or {"path": "/no", "lang": "no"} as JSON.
 */

const [baseUrl, ...args] = process.argv.slice(2);

if (!baseUrl || args.length === 0) {
  console.error(
    'usage: node scripts/assert-render.mjs <baseUrl> <target> [...targets]\n  target: /blog  or  {"path": "/no", "lang": "no"}',
  );
  process.exit(1);
}

const targets = args.map((raw) => {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = raw;
  }
  return typeof parsed === "string" ? { path: parsed } : parsed;
});

const BLOCK = /data-block-id="/g;
const UNKNOWN = /data-cmssy-unknown-block="([^"]*)"/g;
const TAG = /<[^>]+>/g;

function textOf(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(TAG, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const HTML_LANG = /<html[^>]*\slang="([^"]*)"/;

const failures = [];

for (const { path, lang } of targets) {
  const url = new URL(path, baseUrl).toString();
  let res;
  try {
    res = await fetch(url, { redirect: "follow" });
  } catch (error) {
    failures.push(`${path}: request failed - ${error.message}`);
    continue;
  }

  if (!res.ok) {
    failures.push(`${path}: HTTP ${res.status}`);
    continue;
  }

  const html = await res.text();
  const blocks = html.match(BLOCK)?.length ?? 0;
  const unknown = [...html.matchAll(UNKNOWN)].map((m) => m[1]);
  const text = textOf(html);

  if (blocks === 0) {
    failures.push(`${path}: the page carries no cmssy blocks at all`);
    continue;
  }

  if (unknown.length > 0) {
    const types = [...new Set(unknown)].join(", ");
    failures.push(
      `${path}: ${unknown.length} of ${blocks} blocks have no component - ${types}`,
    );
    continue;
  }

  if (text.length < 200) {
    failures.push(
      `${path}: renders ${blocks} blocks but only ${text.length} characters of text`,
    );
    continue;
  }

  if (lang) {
    const served = html.match(HTML_LANG)?.[1];
    if (served !== lang) {
      failures.push(
        `${path}: served <html lang="${served ?? ""}">, expected "${lang}" - the locale prefix in the URL never reached the page`,
      );
      continue;
    }
  }

  console.log(
    `  ${path}: ${blocks} blocks, ${text.length} characters${lang ? `, lang="${lang}"` : ""}`,
  );
}

if (failures.length > 0) {
  console.error("\nRender assertion FAILED:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("Render assertion passed.");
