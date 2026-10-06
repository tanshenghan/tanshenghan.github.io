import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Read-only checks for the imported catalog in both docs/ and root-based Pages.
// Run the build separately; this test never writes or regenerates site content.
const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const siteDir = process.env.SITE_OUTPUT_DIR
  ? path.resolve(process.env.SITE_OUTPUT_DIR)
  : path.resolve(toolsDir, fs.existsSync(path.resolve(toolsDir, "../docs/index.html")) ? "../docs" : "..");
const blogDir = path.join(siteDir, "blog");
const posts = JSON.parse(fs.readFileSync(path.join(toolsDir, "posts.json"), "utf8"));
const post = posts.find((entry) => entry.seriesSlug === "vln-voyager" && entry.slug === "agentic-vln");
assert.ok(post, "VLN Voyager Part 01 must remain registered");
assert.equal(post.title, "Agentic VLN");
assert.equal(post.number, "01");
assert.equal(post.format, "catalog");

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

function openingTags(html, tagName = "[a-z][\\w:-]*") {
  return [...html.matchAll(new RegExp(`<(${tagName})\\b[^>]*>`, "gi"))]
    .map((match) => ({ name: match[1].toLowerCase(), attrs: attributes(match[0]), markup: match[0] }));
}

function textContent(html) {
  return decodeHtml(html.replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function elements(html, name, idPattern) {
  return [...html.matchAll(new RegExp(`<${name}\\b([^>]*)>([\\s\\S]*?)<\\/${name}>`, "gi"))]
    .map((match) => ({ attrs: attributes(match[1]), content: match[2] }))
    .filter((entry) => idPattern.test(entry.attrs.id ?? ""));
}

function links(html) {
  return openingTags(html, "a").map((tag) => tag.attrs.href).filter(Boolean);
}

function tableData(html) {
  return [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map((match) => textContent(match[1]));
}

function imageSources(html) {
  return openingTags(html, "img").map((tag) => tag.attrs["data-src"] || tag.attrs.src);
}

function ids(html, label) {
  const entries = openingTags(html).map((tag) => tag.attrs.id).filter(Boolean);
  assert.equal(new Set(entries).size, entries.length, `${label}: duplicate element IDs`);
  return new Set(entries);
}

const seriesOrder = [...new Set(posts.map((entry) => entry.seriesSlug))];
assert.deepEqual(seriesOrder.slice(0, 2), ["flow-matching", "vln-voyager"], "Flow matching and VLN Voyager must remain the first two series");
assert.ok(textContent(index).includes(`${seriesOrder.length} 个系列 / ${posts.length} 篇笔记`), "index totals must match all registered series and articles");
assert.ok(index.indexOf('href="flow-matching/"') < index.indexOf('href="vln-voyager/"'), "visible series order must match metadata");
assert.ok(links(index).includes("vln-voyager/"), "blog index must link to the new series");
assert.ok(links(index).includes("vln-voyager/agentic-vln/"), "blog index must link directly to Part 01");
assert.match(series, /<h1>VLN Voyager<\/h1>/, "series page must have its own heading");
assert.ok(links(series).includes("../vln-voyager/agentic-vln/"), "series directory must link to Agentic VLN");
assert.match(textContent(series), /01[\s\S]*Agentic VLN/, "series directory must identify its first part");
assert.match(article, /<h1\b[^>]*>Agentic VLN<\/h1>/, "independent article title must be Agentic VLN");
assert.match(article, /<title>[^<]*Agentic VLN[^<]*VLN Voyager[^<]*<\/title>/, "document title must identify the article and series");
assert.ok(textContent(article).includes(post.author), "article must show its registered byline");
assert.match(textContent(article), /PART\s*01/i, "article must visibly identify Part 01");
assert.ok(links(article).includes("../"), "article needs a return-to-series link");
assert.ok(links(article).includes("../../"), "article needs a return-to-blog link");
assert.ok(links(article).includes("../../../"), "article needs a homepage link");
for (const phrase of ["统一实验结果表", "Agentic VLN 增加的能力", "详细阅读", "设计哲学", "训练边界", "未复现实验"]) {
  assert.ok(textContent(article).includes(phrase), `the original Chinese catalog must retain ${phrase}`);
}

const sourcePapers = elements(source, "article", /^paper-\d+$/);
const outputPapers = elements(article, "article", /^paper-\d+$/);
const expectedPaperIds = sourcePapers.map((paper) => paper.attrs.id);
assert.equal(sourcePapers.length, 54, "reviewed snapshot contains 54 chronologically ordered papers");
assert.deepEqual(outputPapers.map((paper) => paper.attrs.id), expectedPaperIds, "publishing must not drop or reorder papers");
sourcePapers.forEach((original, i) => {
  const rendered = outputPapers[i];
  const label = original.attrs.id;
  assert.equal(textContent(rendered.content), textContent(original.content), `${label}: complete visible article text must remain unchanged`);
  assert.deepEqual(tableData(rendered.content), tableData(original.content), `${label}: component tables must remain unchanged`);
  assert.deepEqual(JSON.parse(rendered.attrs["data-search"]), JSON.parse(original.attrs["data-search"]), `${label}: all original structured search data must remain unchanged`);
  assert.equal(rendered.attrs["data-collection"], original.attrs["data-collection"], `${label}: original/new collection grouping must remain unchanged`);
  assert.deepEqual(links(rendered.content), links(original.content), `${label}: original papers, figures and result links must remain unchanged`);
  assert.deepEqual(imageSources(rendered.content), imageSources(original.content), `${label}: original figure sources must remain unchanged`);
});

const sourceRows = elements(source, "tr", /^result-\d+-\d+$/);
const outputRows = elements(article, "tr", /^result-\d+-\d+$/);
assert.equal(sourceRows.length, 113, "source snapshot must contain 113 result rows");
assert.deepEqual(outputRows.map((row) => row.attrs.id), sourceRows.map((row) => row.attrs.id), "all experimental results must remain in order");
sourceRows.forEach((original, i) => {
  const rendered = outputRows[i];
  assert.equal(textContent(rendered.content), textContent(original.content), `${original.attrs.id}: full experimental result and caveats must be retained`);
  assert.deepEqual(rendered.attrs, original.attrs, `${original.attrs.id}: benchmark, boundary and structured result data must be retained`);
  assert.deepEqual(links(rendered.content), links(original.content), `${original.attrs.id}: evidence links must remain intact`);
});

const originalImages = imageSources(source);
assert.equal(originalImages.length, 57, "catalog must retain all figures and supplementary flowcharts");
const remoteImages = originalImages.filter((url) => /^https?:\/\//.test(url));
assert.equal(remoteImages.length, 40, "40 original online figures must remain attributed and linked");
assert.deepEqual(imageSources(article).filter((url) => /^https?:\/\//.test(url)), remoteImages, "all remote figures must retain their original URLs");
assert.ok(article.includes("版权归论文作者"), "figure copyright attribution must remain visible");

const htmlCache = new Map([[indexFile, index], [seriesFile, series], [articleFile, article]]);
const idCache = new Map();
function readIds(file) {
  if (!idCache.has(file)) {
    const html = htmlCache.get(file) ?? fs.readFileSync(file, "utf8");
    idCache.set(file, ids(html, path.relative(siteDir, file)));
  }
  return idCache.get(file);
}

let checkedResources = 0;
function checkLocalReference(reference, owner) {
  if (!reference || /^(?:https?:|data:|mailto:|tel:|javascript:|\/\/)/i.test(reference)) return;
  const local = new URL(reference, `https://catalog.invalid/${path.relative(siteDir, owner).split(path.sep).join("/")}`);
  let target = path.join(siteDir, decodeURIComponent(local.pathname));
  assert.ok(fs.existsSync(target), `${path.relative(siteDir, owner)}: missing resource ${reference}`);
  if (fs.statSync(target).isDirectory()) target = path.join(target, "index.html");
  assert.ok(fs.existsSync(target), `${reference}: destination directory must contain index.html`);
  if (local.hash && /\.html?$/i.test(target)) {
    assert.ok(readIds(target).has(decodeURIComponent(local.hash.slice(1))), `${path.relative(siteDir, owner)}: broken fragment ${reference}`);
  }
  checkedResources += 1;
}

for (const [file, html] of htmlCache) {
  readIds(file);
  assert.doesNotMatch(html, /file:\/\/|\/Users\/|\/private\/|localhost|127\.0\.0\.1/i, `${path.relative(siteDir, file)}: no local paths or private preview addresses may be published`);
  for (const tag of openingTags(html)) {
    for (const name of ["href", "src", "data-src"]) {
      if (tag.attrs[name]) checkLocalReference(tag.attrs[name], file);
    }
  }
}

// Assets are kept standalone to prevent the imported page's styles and runtime
// from changing the existing Flow article. Missing export links are forbidden.
for (const basename of ["catalog.css", "catalog.js"]) {
  const file = path.join(path.dirname(articleFile), basename);
  assert.ok(fs.existsSync(file), `${basename} must exist beside the imported article`);
  const content = fs.readFileSync(file, "utf8");
  assert.doesNotMatch(content, /file:\/\/|\/Users\/|\/private\/|localhost|127\.0\.0\.1/i, `${basename}: no private filesystem references`);
  if (basename.endsWith(".css")) {
    for (const match of content.matchAll(/url\(\s*["']?([^)'"\s]+)["']?\s*\)/g)) checkLocalReference(match[1], file);
  }
}
for (const basename of ["vln-experiment-results.csv", "vln-paper-catalog.md", "vln-paper-catalog.json"]) {
  for (const href of links(article).filter((href) => href.split(/[?#]/)[0].endsWith(basename))) {
    checkLocalReference(href, articleFile);
  }
}
for (const controlId of ["search", "paper-year", "result-search", "benchmark", "boundary-filter", "reset-papers", "reset-results", "directory-toggle", "directory-panel", "directory-search"]) {
  assert.ok(readIds(articleFile).has(controlId), `interactive control ${controlId} must remain available`);
}

assert.equal((article.match(/class="math-source"/g) || []).length, (source.match(/class="math-source"/g) || []).length, "all local TeX sources must be retained");
console.log(`VLN blog checks passed: ${seriesOrder.length} ordered series, ${posts.length} articles, ${sourcePapers.length} complete papers, ${sourceRows.length} result rows, ${originalImages.length} attributed figures, ${checkedResources} local resources/anchors.`);
