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
  // October 2026 reports: local chart/model calculations, UI events and
  // user-triggered Blob exports; no network requests or dynamic evaluation.
  "912f1f16cdba60368df165781e16451b10dea1c4b15bb0765a67c656e513ff36", // 宝丰能源
  "e953a5a2ef83e2d72d4f0e6ffd6dd5b613c454f4654df7ebb89898b9b7c6737a", // 顺丰控股
  "8587d9e5c7c0c03d4b9b338d47d7a23d609c72fd8b33f0c9a1b8e24a19d5b2ad", // 珀莱雅
  "b08f90006ba10a04593229685e97905c02ebd0dc2ec1a3f1c7735b486bc9a393", // 峰岹科技
  "92d4be4b8f271eb3dc34afc0bd5c24da44dae1bbbb1aedfa322e184ad83c0c51", // 嘉友国际
  "5e72fd6280a39766f92841b1333a72ab6e991471efb3a08d9da1a848e5eb238c", // 中国太保
  "7262204650b33fac33df23f5b922e10d3f23eac84059f71812e8b40989f68fe4", // 赛轮轮胎
  "108bbc785175c678efe52b128b5b42b21bec87c4d2187cc3e5c7af3cbe1292f4", // 迈瑞医疗
  "1c4aafcb2cfc4c024035e2599319ad6672806e5405a5e7ce653f1067da978350", // 信达生物
  "b46a83ec336c616ab2f07ac7d3992360c68f89bb968052861e1fb916bf154394", // 美的集团
  "299380b1c90e91e59d8f74963a6ee752267d73f6105e5d7cbdec6537b5bc14b0", // 招商银行
]);

// The public reports retain source filenames, not the author's machine paths.
// Limit this change to JSON metadata: prose, calculations and public URLs stay intact.
export function publicReportSnapshot(source) {
  return source.replace(/(<script\b[^>]*type=["']application\/json["'][^>]*>)([\s\S]*?)(<\/script>)/gi,
    (_, open, json, close) => {
      JSON.parse(json);
      const safe = json.replace(/"(?:[^"\\]|\\.)*"/g, (token) => {
        const value = JSON.parse(token);
        if (!/^\/(?:Users|home|private)\//.test(value)) return token;
        return JSON.stringify(path.posix.basename(value));
      });
      return open + safe + close;
    });
}

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
