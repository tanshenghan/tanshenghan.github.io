import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const decode = (value) => value.replace(/&amp;/g, "&").replace(/&#(?:x([0-9a-f]+)|(\d+));/gi, (_, hex, decimal) => String.fromCodePoint(parseInt(hex || decimal, hex ? 16 : 10)));

// Audited 2026-09-30: this script only filters the local paper/result lists,
// opens the accessible directory, resets filters, and reveals image fallbacks.
// A changed source script must be reviewed before updating this allowlist.
const reviewedScripts = new Set([
  "50b39108d5eab9bd29588e9ca3bcd455636e0bce59ee68aeac401a62386fefed",
  // Reviewed 2026-10-06: local year/tag filters, numeric sorting and directory.
  "905a9bb853979287d2d0578e9b4e14f97b849034579249c7dc94c6c95c386487",
  // Reviewed 2026-10-09: E2E catalog filters/sorting, drawer, local JSON/CSV export.
  "1d1345ece42f8fb84b5b945e8b2ee3ac46cc73003a4f025b06fd851c142fad9f",
]);
const reviewedDependencies = new Map([
  ["assets/mathjax-config.js", "2937d2527e5e30d9698ef8c1f7a9f26aab64ed49a4d6ec2b4e9fc5d638187c35"],
  ["assets/mathjax/tex-svg.js", "d4295dc33744836935c1399feece5159577b34c5c8ffb9f1c6324cd82e03a882"],
]);
const downloadable = /\.(?:csv|json|md|pdf)$/i;
const allowedAsset = /\.(?:png|jpe?g|webp|gif|svg|avif|csv|json|md|pdf)$/i;

/** Adapt the reviewed, self-contained survey without rewriting its research. */
export function buildVlnCatalog({ sourcePath, outputDir, post, headerHtml }) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const isE2e = post.catalogKind === "e2e";
  const sourceDir = fs.realpathSync(path.dirname(sourcePath));
  const scripts = [...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  const dependencies = [];
  for (const [, attributes, script] of scripts) {
    if (isE2e && attributes.trim() === 'id="paper-data" type="application/json"') {
      if (!Array.isArray(JSON.parse(script))) throw new Error("Expected E2E paper data array.");
      continue;
    }
    const src = attributes.match(/\bsrc="([^"]+)"/)?.[1];
    if (src && reviewedDependencies.has(src) && !script.trim() &&
        !attributes.replace(/\bsrc="[^"]+"|\bid="MathJax-script"|\bdefer/g, "").trim()) {
      const input = fs.realpathSync(path.join(sourceDir, src));
      if (!input.startsWith(sourceDir + path.sep) || createHash("sha256").update(fs.readFileSync(input)).digest("hex") !== reviewedDependencies.get(src)) {
        throw new Error("The local math renderer changed and needs review.");
      }
      dependencies.push({ input, relative: src });
      continue;
    }
    const digest = createHash("sha256").update(script).digest("hex");
    if (attributes.trim() || !reviewedScripts.has(digest)) {
      throw new Error("The VLN catalog script changed and needs review before publishing.");
    }
  }
  if (/\s+on[a-z]+\s*=|<(?:iframe|object|embed|base)\b|(?:href|src)\s*=\s*["']\s*(?:javascript|file):/i.test(source)) {
    throw new Error("Unsupported active content or local-machine URL in the VLN catalog.");
  }
  const styles = [...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((match) => match[1]);
  if (styles.some((css) => /@import|url\s*\(/i.test(css))) {
    throw new Error("Review new external CSS dependencies before publishing the VLN catalog.");
  }
  let body = source.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1];
  if (!body || !/<main id="top">/.test(body)) throw new Error("The VLN catalog document structure changed.");
  body = body.replace(/<script\b([^>]*)>[\s\S]*?<\/script>/gi, (tag, attributes) => isE2e && attributes.trim() === 'id="paper-data" type="application/json"' ? tag : "");
  // The October snapshot omitted the results section's closing tag. Keep
  // reading/catalog sections as siblings without changing research content.
  body = body.replace(/(<p class="empty" id="result-empty"[^>]*>[\s\S]*?<\/p>)(\s*<section id="reading")/, '$1</section>$2');

  const references = [...new Set([...body.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)].map((match) => match[1]))];
  const assets = [...dependencies];
  if (dependencies.length) assets.push({ input: path.join(sourceDir, "assets/mathjax/LICENSE"), relative: "assets/mathjax/LICENSE" });
  const omittedAssets = [];
  for (const reference of references) {
    const url = decode(reference);
    if (isE2e && url === "vln-paper-catalog.html") continue;
    if (/^(?:https?:\/\/|#|mailto:)/i.test(url)) continue;
    const relative = decodeURIComponent(url.split(/[?#]/)[0]);
    const parts = relative.split(/[\\/]/);
    if (path.isAbsolute(relative) || parts.includes("..") || !allowedAsset.test(relative)) {
      throw new Error("Unsupported local dependency in the VLN catalog: " + relative);
    }
    const input = path.resolve(sourceDir, relative);
    if (!fs.existsSync(input)) {
      if (!downloadable.test(relative)) throw new Error("Missing VLN catalog image: " + relative);
      omittedAssets.push(reference);
      continue;
    }
    const real = fs.realpathSync(input);
    if (!real.startsWith(sourceDir + path.sep) || !fs.statSync(real).isFile()) {
      throw new Error("VLN catalog dependencies must stay within the source directory.");
    }
    assets.push({ input: real, relative });
  }

  // The source advertises companion files which may not have been supplied.
  // Remove unavailable download affordances rather than publishing dead links.
  body = body.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (anchor, attributes) => {
    const href = attributes.match(/\bhref=["']([^"']+)["']/i)?.[1];
    return omittedAssets.includes(href) ? "" : anchor;
  });
  if (omittedAssets.length) {
    body = body.replace("此页、JSON和CSV由同一数据源生成。", "");
    body = body.replace(/<br>\s*(?:·\s*)*<\/footer>/g, "</footer>");
  }
  body = body.replace(/<img\b([^>]*)>/gi, (_, attributes) => '<img' + attributes.replace(/\s+(?:loading|decoding)=["'][^"']*["']/gi, "") + ' loading="lazy" decoding="async">');
  body = body.replace("悬停展开 · 移开收起", "悬停或点击展开 · Esc 收起");
  if (isE2e) body = body.replaceAll('href="vln-paper-catalog.html"', 'href="../agentic-vln/"');

  const number = String(post.number || "01").padStart(2, "0");
  const date = post.date || "2026-09-30";
  const canonical = "https://tanshenghan.github.io/blog/" + post.seriesSlug + "/" + post.slug + "/";
  const intro = '<div id="main" tabindex="-1"></div><nav class="vln-breadcrumbs" aria-label="面包屑"><a href="../../">BLOG</a><span>/</span><a href="../">' + escape(post.series) + '</a><span>/</span><span>Part ' + number + '</span></nav><header class="vln-heading"><p class="vln-eyebrow">' + escape(post.series) + ' / PART ' + number + '</p><h1>' + escape(post.title) + '</h1><p class="vln-subtitle">' + escape(post.description) + '</p><div class="vln-meta"><span>' + escape(post.author || "shong Tan") + '</span><time datetime="' + escape(date) + '">' + escape(date.replaceAll("-", ".")) + '</time><span>中文笔记 · 论文调研</span></div></header>';
  body = body.replace('<main id="top">', '<main id="top" class="vln-main">' + intro);
  if (post.updated) body = body.replace('<span>中文笔记 · 论文调研</span>', '<span>更新于 <time datetime="' + escape(post.updated) + '">' + escape(post.updated.replaceAll("-", ".")) + '</time></span><span>中文笔记 · 论文调研</span>');
  body = body.replace(/<div class="eyebrow">([^<]*)<\/div>\s*<h1>([\s\S]*?)<\/h1>/, '<div class="vln-source-intro"><p class="eyebrow">$1</p><p class="vln-original-title">$2</p></div>');
  if (isE2e) body = body.replace('</main>', '<nav class="vln-previous" aria-label="上一篇"><a href="../agentic-vln/">← Part 01 · Agentic VLN</a></nav></main>');
  body = body.replace('</main>', '<nav class="vln-article-end" aria-label="继续阅读"><a href="../">← ' + escape(post.series) + '</a><a href="../../">全部技术博客 →</a></nav></main>');
  if (/file:\/\/|\/Users\//i.test(body)) throw new Error("A local-machine path would be exposed in the generated VLN page.");

  const footer = '<footer class="vln-site-footer"><span>© ' + escape(date.slice(0, 4)) + ' 谭圣涵 · Shenghan Tan</span><a href="#top">回到顶部 ↑</a></footer>';
  const html = '<!doctype html>\n<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="' + escape(post.description) + '"><meta name="theme-color" content="#f8f9fb"><meta property="og:type" content="article"><meta property="og:title" content="' + escape(post.title + ' · ' + post.series) + '"><meta property="og:description" content="' + escape(post.description) + '"><link rel="canonical" href="' + escape(canonical) + '"><title>' + escape(post.title + ' · ' + post.series + ' · 谭圣涵') + '</title><link rel="stylesheet" href="catalog.css?v=20260930"><script src="../../blog.js?v=20260930-vln" defer></script><script src="catalog.js?v=20260930" defer></script></head><body>' + headerHtml + body + footer + '</body></html>\n';

  const finalHtml = html.replace('</head>', dependencies.map((asset) => '<script src="' + escape(asset.relative) + '" defer></script>').join('') + '</head>').replaceAll('catalog.css?v=20260930', 'catalog.css?v=20261006').replaceAll('catalog.js?v=20260930', 'catalog.js?v=20261006');
  fs.mkdirSync(outputDir, { recursive: true });
  for (const asset of assets) {
    const destination = path.join(outputDir, asset.relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(asset.input, destination);
  }
  fs.writeFileSync(path.join(outputDir, "index.html"), isE2e ? finalHtml.replace('<html lang="zh-CN">', '<html lang="zh-CN" class="no-js">').replaceAll('v=20261006', 'v=20261009') : finalHtml);
  fs.writeFileSync(path.join(outputDir, "catalog.css"), styles.join("\n") + "\n" + fs.readFileSync(path.join(toolsDir, "vln-catalog.css"), "utf8") + (isE2e ? "\n" + fs.readFileSync(path.join(toolsDir, "e2e-vln.css"), "utf8") : ""));
  fs.writeFileSync(path.join(outputDir, "catalog.js"), scripts.filter((match) => !match[1].includes('application/json')).map((match) => match[2]).join("\n") + '\n// Handle already-failed lazy images as well as future error events.\ndocument.querySelectorAll("figure img").forEach((image) => { if (image.complete && !image.naturalWidth) { const fallback = image.closest("figure").querySelector(".image-fallback"); if (fallback) fallback.hidden = false; } });\n');
  return { papers: [...body.matchAll(/<article\b/g)].length, assets: assets.map((asset) => asset.relative), omittedAssets, output: path.join(outputDir, "index.html") };
}
