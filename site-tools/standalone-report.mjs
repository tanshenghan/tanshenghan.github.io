import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[c]);

// The imported report is self-contained. Re-review executable code if the
// source changes; data/content updates alone do not require a runtime change.
const reviewedScripts = new Set([
  "a65ce0933767cf32083dd714d355dcdf51025c153e53441f964e7fac0cda1b5e",
  "550c79df456d51af283959c0b1bca71a78b6bb6c905fcfe46e61d81ab76aa325",
]);

export function buildStandaloneReport({ sourcePath, outputDir, post }) {
  const source = fs.readFileSync(sourcePath, "utf8");
  assert.doesNotMatch(source, /<(?:iframe|object|embed|form|base)\b/i, "Report embeds/forms require a separate review");
  assert.doesNotMatch(source, /<(?:script|img|link)\b[^>]*(?:src|href)\s*=/i, "Import report assets explicitly before publishing");
  assert.doesNotMatch(source, /file:\/\/|\/Users\/|\/private\/|localhost|127\.0\.0\.1/i, "Report must not publish private filesystem references");
  let scriptCount = 0;
  for (const match of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (/type=["']application\/json["']/i.test(match[1])) {
      JSON.parse(match[2]);
      continue;
    }
    const hash = crypto.createHash("sha256").update(match[2]).digest("hex");
    assert.ok(reviewedScripts.has(hash), "Report runtime changed: review the source before updating the approved hash");
    scriptCount += 1;
  }
  assert.equal(scriptCount, 1, "Expected the reviewed standalone report runtime");

  const replaceOnce = (html, pattern, replacement, label) => {
    assert.equal([...html.matchAll(new RegExp(pattern.source, "g"))].length, 1, `Expected one ${label}`);
    return html.replace(pattern, replacement);
  };
  const canonical = `https://tanshenghan.github.io/blog/${post.seriesSlug}/${post.slug}/`;
  // Scope the document title to head; chart templates can contain SVG titles.
  const headEnd = source.indexOf("</head>");
  assert.ok(headEnd > 0, "Report must contain a document head");
  let html = replaceOnce(source.slice(0, headEnd), /<title>[^<]*<\/title>/,
    `<title>${escape(post.title)} · ${escape(post.series)} · shong Tan</title>`, "document title") + source.slice(headEnd);
  html = replaceOnce(html, /<h1>[^<]*(?=<small>|<br>)/,
    `<h1>${escape(post.title)}`, "report heading");
  html = replaceOnce(html, /<\/head>/, `<link rel="canonical" href="${canonical}">
<meta property="og:type" content="article">
<meta property="og:title" content="${escape(post.title)} · ${escape(post.series)}">
<meta property="og:description" content="${escape(post.description)}">
<meta property="og:url" content="${canonical}">
<meta name="author" content="${escape(post.author)}">
<style data-blog-integration>
.blog-context{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin:0 0 24px;padding:0 0 16px;border-bottom:1px solid var(--line);font-size:12px;color:var(--muted)}
.blog-context a{text-decoration:none;min-height:36px;display:inline-flex;align-items:center;transition:color .2s}
.blog-context a:hover{text-decoration:underline}.blog-context .blog-home{margin-left:auto}
@media(max-width:600px){.blog-context{font-size:11px;gap:5px 9px;margin-bottom:20px}.blog-context a{min-height:40px}}
@media print{.blog-context{display:none}}
</style></head>`, "head closing tag");
  html = replaceOnce(html, /<main(?: class="main" id="main")?>/,
    (main) => `${main}<nav class="blog-context" aria-label="博客导航"><a href="../../">BLOG</a><span aria-hidden="true">/</span><a href="../">${escape(post.series)}</a><span aria-hidden="true">/</span><span aria-current="page">${escape(post.title)}</span><a class="blog-home" href="../../../">个人主页 ↗</a></nav>`, "main report container");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "index.html"), html);
  return { scripts: scriptCount, bytes: Buffer.byteLength(html) };
}
