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
 * Usage: node scripts/assert-render.mjs <baseUrl> <path> [...paths]
 */

const [baseUrl, ...paths] = process.argv.slice(2);

if (!baseUrl || paths.length === 0) {
  console.error(
    "usage: node scripts/assert-render.mjs <baseUrl> <path> [...paths]",
  );
  process.exit(1);
}

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

const failures = [];

for (const path of paths) {
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

  console.log(`  ${path}: ${blocks} blocks, ${text.length} characters`);
}

if (failures.length > 0) {
  console.error("\nRender assertion FAILED:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("Render assertion passed.");
