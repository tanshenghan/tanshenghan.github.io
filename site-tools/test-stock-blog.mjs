import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

// Read-only, source-based preservation checks. Run the build separately.
// These checks validate importing the supplied report, not its financial claims.
const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const siteDir = process.env.SITE_OUTPUT_DIR
  ? path.resolve(process.env.SITE_OUTPUT_DIR)
  : path.resolve(toolsDir, fs.existsSync(path.resolve(toolsDir, "../docs/index.html")) ? "../docs" : "..");
const blogDir = path.join(siteDir, "blog");
const posts = JSON.parse(fs.readFileSync(path.join(toolsDir, "posts.json"), "utf8"));
const post = posts.find((entry) => entry.seriesSlug === "taolao-research" && entry.slug === "baofeng-energy");
assert.ok(post, "the first 套牢研究 article must remain registered");
assert.equal(post.title, "宝丰能源分析");
assert.equal(post.series, "套牢研究");
assert.equal(post.number, "01");
assert.equal(post.format, "standalone-report");
assert.equal(post.source, "baofeng-energy/report.html");

const sourceFile = path.join(toolsDir, "content", post.source);
const articleFile = path.join(blogDir, post.seriesSlug, post.slug, "index.html");
const indexFile = path.join(blogDir, "index.html");
const seriesFile = path.join(blogDir, post.seriesSlug, "index.html");
const source = fs.readFileSync(sourceFile, "utf8");
const article = fs.readFileSync(articleFile, "utf8");
const index = fs.readFileSync(indexFile, "utf8");
const series = fs.readFileSync(seriesFile, "utf8");

function decodeHtml(value) {
  const named = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " };
  return value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (entity, code) => {
    if (code[0] !== "#") return named[code.toLowerCase()] ?? entity;
    const hex = code[1].toLowerCase() === "x";
    return String.fromCodePoint(Number.parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10));
  });
}

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/(?:^|\s)([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)]
    .map((match) => [match[1].toLowerCase(), decodeHtml(match[2] ?? match[3] ?? match[4])]));
}

function withoutRawText(html) {
  return html.replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
}

function openingTags(html, name = "[a-z][\\w:-]*") {
  // Do not interpret HTML templates inside JavaScript as live document elements.
  return [...withoutRawText(html).matchAll(new RegExp(`<(${name})\\b[^>]*>`, "gi"))]
    .map((match) => ({ name: match[1].toLowerCase(), attrs: attributes(match[0]) }));
}

function blocks(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b([^>]*)>([\\s\\S]*?)<\\/${name}>`, "gi"))]
    .map((match) => ({ markup: match[0], attrs: attributes(match[1]), content: match[2] }));
}

function textContent(html) {
  return decodeHtml(withoutRawText(html).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function links(html) {
  return openingTags(html, "a").map((tag) => tag.attrs.href).filter(Boolean);
}

// Find a full wrapper even if its integration navigation contains nested divs.
function contextBlock(html) {
  const candidates = [...html.matchAll(/<([a-z][\w:-]*)\b[^>]*>/gi)]
    .filter((match) => (attributes(match[0]).class ?? "").split(/\s+/).includes("blog-context"));
  assert.equal(candidates.length, 1, "article must have one blog-context navigation wrapper");
  const start = candidates[0];
  const tagName = start[1];
  const tags = new RegExp(`<(/?)${tagName}\\b[^>]*>`, "gi");
  tags.lastIndex = start.index;
  let depth = 0;
  for (let match; (match = tags.exec(html));) {
    depth += match[1] ? -1 : 1;
    if (depth === 0) return { start: start.index, end: tags.lastIndex, markup: html.slice(start.index, tags.lastIndex) };
  }
  assert.fail("blog-context wrapper must have a matching closing tag");
}

const order = [...new Set(posts.map((entry) => entry.seriesSlug))];
assert.deepEqual(order, ["flow-matching", "vln-voyager", "taolao-research"], "existing series must remain ahead of 套牢研究");
assert.equal(posts.length, 3, "the blog must contain three registered articles after this import");
assert.equal(posts.filter((entry) => entry.seriesSlug === post.seriesSlug).length, 1, "宝丰能源分析 must be the first article in its series");
assert.match(textContent(index), /3 个系列\s*\/\s*3 篇笔记/, "index totals must include the new series and article");
order.forEach((slug, i) => {
  assert.ok(links(index).includes(`${slug}/`), `index must link to ${slug}`);
  if (i) assert.ok(index.indexOf(`href="${order[i - 1]}/"`) < index.indexOf(`href="${slug}/"`), "visible series order must match metadata");
});
assert.ok(links(index).includes("taolao-research/baofeng-energy/"), "index must link directly to the report");
assert.equal(blocks(series, "h1").length, 1, "series page must have one h1");
assert.equal(textContent(blocks(series, "h1")[0].content), "套牢研究");
assert.ok(links(series).includes("../taolao-research/baofeng-energy/"), "series directory must link to its first article");
assert.match(textContent(series), /01[\s\S]*宝丰能源分析/, "series must identify Part 01 by title");

assert.equal(blocks(article, "title").length, 1, "report must retain one document title");
assert.match(textContent(blocks(article, "title")[0].content), /宝丰能源分析.*套牢研究/, "document title must identify both the report and its series");
const originalHeading = blocks(source, "h1");
const importedHeading = blocks(article, "h1");
assert.equal(originalHeading.length, 1);
assert.equal(importedHeading.length, 1);
assert.match(importedHeading[0].content, /^\s*宝丰能源分析\s*(?:<|$)/, "visible report title must match metadata");
assert.deepEqual(blocks(importedHeading[0].content, "small"), blocks(originalHeading[0].content, "small"), "the original subtitle must be preserved");
const context = contextBlock(article);
assert.ok(article.indexOf('<main') < context.start && context.end <= article.indexOf('<header class="report-header'), "blog navigation must appear inside main before the report header");
for (const href of ["../../../", "../../", "../"]) assert.ok(links(context.markup).includes(href), `navigation must include ${href}`);
assert.ok(textContent(context.markup).includes("套牢研究"), "navigation must name the series");

const sourceScripts = blocks(source, "script");
const articleScripts = blocks(article, "script");
assert.equal(sourceScripts.length, 2, "source has one JSON dataset and one inline runtime");
assert.deepEqual(articleScripts, sourceScripts, "all original script tags, data and runtime must be preserved byte for byte with no injected runtime");
const sourceData = sourceScripts.find((entry) => entry.attrs.id === "report-data");
assert.equal(sourceData?.attrs.type, "application/json");
assert.deepEqual(Object.keys(JSON.parse(sourceData.content)).sort(), ["modelV2", "products"], "embedded datasets must remain readable");
for (const script of articleScripts) if (script.attrs.type !== "application/json") new vm.Script(script.content, { filename: "baofeng-energy-inline.js" });
const sourceStyles = blocks(source, "style");
const articleStyles = blocks(article, "style");
assert.ok(sourceStyles.length > 0);
assert.equal(articleStyles.length, sourceStyles.length + 1, "integration styles must live in one separate style block");
assert.deepEqual(articleStyles.filter((entry) => !entry.content.includes(".blog-context")), sourceStyles, "original report styles must be preserved byte for byte");
assert.equal(articleStyles.filter((entry) => entry.content.includes(".blog-context")).length, 1);

// Preserve every original paragraph, table, caveat, source, control and link.
// Only the heading and added blog navigation are outside this comparison.
function financialBody(html, integration) {
  const body = blocks(html, "body");
  assert.equal(body.length, 1);
  let result = body[0].content;
  if (integration) result = result.replace(integration.markup, "");
  return result.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi, "")
    .replace(/>\s+</g, "><").trim();
}
assert.equal(financialBody(article, context), financialBody(source), "entire supplied report body must remain unchanged except the article heading and added navigation");
const sectionIds = (html) => openingTags(html, "section").map((entry) => entry.attrs.id).filter(Boolean);
assert.deepEqual(sectionIds(source), ["thesis", "products", "financials", "model", "sources"]);
assert.deepEqual(sectionIds(article), sectionIds(source), "all five report sections must retain their order");

const htmlCache = new Map([[indexFile, index], [seriesFile, series], [articleFile, article]]);
const idCache = new Map();
function readIds(file) {
  if (!idCache.has(file)) {
    const html = htmlCache.get(file) ?? fs.readFileSync(file, "utf8");
    const entries = openingTags(html).map((entry) => entry.attrs.id).filter(Boolean);
    assert.equal(entries.length, new Set(entries).size, `${path.relative(siteDir, file)}: duplicate IDs`);
    idCache.set(file, new Set(entries));
  }
  return idCache.get(file);
}

let checkedReferences = 0;
function checkLocalReference(reference, owner) {
  assert.doesNotMatch(reference, /^(?:file:|javascript:)/i, "published links must not use filesystem or executable URLs");
  if (!reference || /^(?:https?:|data:|mailto:|tel:|\/\/)/i.test(reference)) return;
  const local = new URL(reference, `https://report.invalid/${path.relative(siteDir, owner).split(path.sep).join("/")}`);
  assert.equal(local.origin, "https://report.invalid", `unsupported reference scheme: ${reference}`);
  let target = path.resolve(siteDir, `.${decodeURIComponent(local.pathname)}`);
  assert.ok(target === siteDir || target.startsWith(siteDir + path.sep), "local resource must remain within the published site");
  assert.ok(fs.existsSync(target), `${path.relative(siteDir, owner)}: missing resource ${reference}`);
  if (fs.statSync(target).isDirectory()) target = path.join(target, "index.html");
  assert.ok(fs.existsSync(target), `${reference}: directory destination must contain index.html`);
  if (local.hash && /\.html?$/i.test(target)) assert.ok(readIds(target).has(decodeURIComponent(local.hash.slice(1))), `${reference}: missing fragment target`);
  checkedReferences += 1;
}

for (const [file, html] of htmlCache) {
  readIds(file);
  assert.doesNotMatch(html, /file:\/\/|\/Users\/|\/home\/|\/private\/|localhost|127\.0\.0\.1|[A-Z]:\\Users\\/i, `${path.relative(siteDir, file)}: private filesystem and preview references are forbidden`);
  for (const tag of openingTags(html)) {
    for (const name of ["href", "src", "data-src", "poster", "action"]) if (tag.attrs[name]) checkLocalReference(tag.attrs[name], file);
    for (const match of (tag.attrs.srcset ?? "").matchAll(/(?:^|,)\s*(\S+)/g)) checkLocalReference(match[1], file);
  }
  for (const script of blocks(html, "script")) if (script.attrs.src) checkLocalReference(script.attrs.src, file);
  for (const style of blocks(html, "style")) {
    for (const match of style.content.matchAll(/url\(\s*["']?([^)'"\s]+)["']?\s*\)/g)) checkLocalReference(match[1], file);
  }
}
for (const controlId of ["print-report", "product-select", "metric-select", "download-products", "v2-period", "v2-anchor", "v2-months", "v2-reset", "v2-stress", "v2-export", "v2-csv", "v2-net", "v2-errors", "v2-heatmap"]) {
  assert.ok(readIds(articleFile).has(controlId), `interactive report control ${controlId} must remain available`);
}
assert.equal(openingTags(article).filter((entry) => ["img", "iframe", "object", "embed"].includes(entry.name)).length, 0, "this report requires no separately copied embedded media");
assert.ok(articleScripts.every((entry) => !entry.attrs.src), "the standalone report must not require remote JavaScript");
console.log(`Stock blog checks passed: 3 ordered series, 3 articles, 5 complete report sections, original data/scripts/styles preserved, ${checkedReferences} local resources/anchors.`);
