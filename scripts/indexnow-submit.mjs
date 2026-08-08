// IndexNow submitter for OJARA.
//
// Pings Bing / Yandex / (and downstream, ChatGPT + Copilot) with the current set
// of live URLs so new/changed pages are crawled within minutes instead of days.
//
// It: (1) verifies the key file is actually reachable on the live host — IndexNow
// silently rejects the whole batch if the key can't be fetched — (2) pulls the
// live sitemap and extracts every <loc>, (3) POSTs them to api.indexnow.org.
//
// Run after any content change:  npm run indexnow:submit
// Re-run whenever you publish a new product or journal article.

const KEY = "128db9726bbfb86a2b468703ef5f78b8";
const SITE =
  (process.env.NEXT_PUBLIC_SITE_URL || "https://www.ojara.co.in").replace(/\/$/, "");
const HOST = new URL(SITE).host;
const KEY_LOCATION = `${SITE}/${KEY}.txt`;
const SITEMAP_URL = `${SITE}/sitemap.xml`;
const ENDPOINT = "https://api.indexnow.org/IndexNow";

async function main() {
  // 1. The key file must be live and contain exactly the key, or IndexNow 403s
  //    the whole submission.
  console.log(`→ Verifying key file at ${KEY_LOCATION}`);
  const keyRes = await fetch(KEY_LOCATION);
  if (!keyRes.ok) {
    console.error(
      `✗ Key file not reachable (HTTP ${keyRes.status}). Deploy first, then re-run.`,
    );
    process.exit(1);
  }
  const keyBody = (await keyRes.text()).trim();
  if (keyBody !== KEY) {
    console.error(
      `✗ Key file content mismatch. Expected "${KEY}", got "${keyBody}".`,
    );
    process.exit(1);
  }
  console.log("✓ Key file verified.");

  // 2. Pull the live sitemap and extract every URL.
  console.log(`→ Fetching sitemap ${SITEMAP_URL}`);
  const smRes = await fetch(SITEMAP_URL);
  if (!smRes.ok) {
    console.error(`✗ Sitemap not reachable (HTTP ${smRes.status}).`);
    process.exit(1);
  }
  const xml = await smRes.text();
  const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1].trim())
    .filter((u) => u.startsWith(SITE));

  if (!urlList.length) {
    console.error("✗ No URLs found in sitemap. Nothing to submit.");
    process.exit(1);
  }
  console.log(`✓ Found ${urlList.length} URLs.`);

  // 3. Submit the batch.
  const payload = { host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList };
  console.log(`→ Submitting ${urlList.length} URLs to ${ENDPOINT}`);
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });

  // IndexNow returns 200 or 202 on success; 4xx signals a key/host problem.
  if (res.ok) {
    console.log(`✓ Submitted. IndexNow responded ${res.status}.`);
  } else {
    console.error(`✗ IndexNow responded ${res.status}: ${await res.text()}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("✗ IndexNow submission failed:", err);
  process.exit(1);
});
