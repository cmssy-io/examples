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
 * `lang` and `elements` are structural too, and both cover a claim the block
 * count cannot see. A locale prefix that never reaches `<html lang>` leaves /no
 * answering 200 with the same blocks whether it served Norwegian or fell back
 * to English. And a page that renders no layout region at all is not a page
 * with a broken block - it is a page one <header> short, which nothing above
 * counts, so `elements` names the tags that have to be on it.
 *
 * `status` says what the URL is supposed to answer, and defaults to 200. Give
 * it another code and the block checks step aside - a 404 has nothing to prove
 * about the workspace's blocks - while `elements` and `lang` still apply, so a
 * missing page can be required to keep the site's chrome.
 *
 * Usage: node scripts/assert-render.mjs <baseUrl> <target> [...targets]
 * where a target is a path, or an object as JSON:
 *   {"path": "/no", "lang": "no", "elements": ["header", "footer"]}
 *   {"path": "/no-such-page", "status": 404}
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

for (const { path, lang, elements = [], status = 200 } of targets) {
  const url = new URL(path, baseUrl).toString();
  let res;
  try {
    res = await fetch(url, { redirect: "follow" });
  } catch (error) {
    failures.push(`${path}: request failed - ${error.message}`);
    continue;
  }

  if (res.status !== status) {
    failures.push(
      status === 200
        ? `${path}: HTTP ${res.status}`
        : `${path}: HTTP ${res.status}, expected ${status}${res.status === 200 ? " - a soft 404 gets indexed and keeps a monitor green" : ""}`,
    );
    continue;
  }

  const html = await res.text();
  const blocks = html.match(BLOCK)?.length ?? 0;
  const unknown = [...html.matchAll(UNKNOWN)].map((m) => m[1]);
  const text = textOf(html);

  if (status === 200) {
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
  }

  const missing = elements.filter(
    (name) => !new RegExp(`<${name}[\\s>]`, "i").test(html),
  );
  if (missing.length > 0) {
    failures.push(
      `${path}: renders ${blocks} blocks but no <${missing.join(">, no <")}> - a layout region that renders nothing looks exactly like one that has nothing to render`,
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
    `  ${path}: HTTP ${res.status}, ${blocks} blocks, ${text.length} characters${lang ? `, lang="${lang}"` : ""}${elements.length ? `, <${elements.join(">, <")}>` : ""}`,
  );
}

if (failures.length > 0) {
  console.error("\nRender assertion FAILED:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("Render assertion passed.");
