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
]);
const downloadable = /\.(?:csv|json|md|pdf)$/i;
const allowedAsset = /\.(?:png|jpe?g|webp|gif|svg|avif|csv|json|md|pdf)$/i;

/** Adapt the reviewed, self-contained survey without rewriting its research. */
export function buildVlnCatalog({ sourcePath, outputDir, post, headerHtml }) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const sourceDir = fs.realpathSync(path.dirname(sourcePath));
  const scripts = [...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  for (const [, attributes, script] of scripts) {
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
  body = body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");

  const references = [...new Set([...body.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)].map((match) => match[1]))];
  const assets = [];
  const omittedAssets = [];
  for (const reference of references) {
    const url = decode(reference);
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

  const number = String(post.number || "01").padStart(2, "0");
  const date = post.date || "2026-09-30";
  const canonical = "https://tanshenghan.github.io/blog/" + post.seriesSlug + "/" + post.slug + "/";
  const intro = '<div id="main" tabindex="-1"></div><nav class="vln-breadcrumbs" aria-label="面包屑"><a href="../../">BLOG</a><span>/</span><a href="../">' + escape(post.series) + '</a><span>/</span><span>Part ' + number + '</span></nav><header class="vln-heading"><p class="vln-eyebrow">' + escape(post.series) + ' / PART ' + number + '</p><h1>' + escape(post.title) + '</h1><p class="vln-subtitle">' + escape(post.description) + '</p><div class="vln-meta"><span>' + escape(post.author || "shong Tan") + '</span><time datetime="' + escape(date) + '">' + escape(date.replaceAll("-", ".")) + '</time><span>中文笔记 · 论文调研</span></div></header>';
  body = body.replace('<main id="top">', '<main id="top" class="vln-main">' + intro);
  body = body.replace(/<div class="eyebrow">([^<]*)<\/div><h1>([\s\S]*?)<\/h1>/, '<div class="vln-source-intro"><p class="eyebrow">$1</p><p class="vln-original-title">$2</p></div>');
  body = body.replace('</main>', '<nav class="vln-article-end" aria-label="继续阅读"><a href="../">← ' + escape(post.series) + '</a><a href="../../">全部技术博客 →</a></nav></main>');
  if (/file:\/\/|\/Users\//i.test(body)) throw new Error("A local-machine path would be exposed in the generated VLN page.");

  const footer = '<footer class="vln-site-footer"><span>© ' + escape(date.slice(0, 4)) + ' 谭圣涵 · Shenghan Tan</span><a href="#top">回到顶部 ↑</a></footer>';
  const html = '<!doctype html>\n<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="' + escape(post.description) + '"><meta name="theme-color" content="#f8f9fb"><meta property="og:type" content="article"><meta property="og:title" content="' + escape(post.title + ' · ' + post.series) + '"><meta property="og:description" content="' + escape(post.description) + '"><link rel="canonical" href="' + escape(canonical) + '"><title>' + escape(post.title + ' · ' + post.series + ' · 谭圣涵') + '</title><link rel="stylesheet" href="catalog.css?v=20260930"><script src="../../blog.js?v=20260930-vln" defer></script><script src="catalog.js?v=20260930" defer></script></head><body>' + headerHtml + body + footer + '</body></html>\n';

  fs.mkdirSync(outputDir, { recursive: true });
  for (const asset of assets) {
    const destination = path.join(outputDir, asset.relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(asset.input, destination);
  }
  fs.writeFileSync(path.join(outputDir, "index.html"), html);
  fs.writeFileSync(path.join(outputDir, "catalog.css"), styles.join("\n") + "\n" + fs.readFileSync(path.join(toolsDir, "vln-catalog.css"), "utf8"));
  fs.writeFileSync(path.join(outputDir, "catalog.js"), scripts.map((match) => match[2]).join("\n") + '\n// Handle already-failed lazy images as well as future error events.\ndocument.querySelectorAll("figure img").forEach((image) => { if (image.complete && !image.naturalWidth) { const fallback = image.closest("figure").querySelector(".image-fallback"); if (fallback) fallback.hidden = false; } });\n');
  return { papers: [...body.matchAll(/<article\b/g)].length, assets: assets.map((asset) => asset.relative), omittedAssets, output: path.join(outputDir, "index.html") };
}
