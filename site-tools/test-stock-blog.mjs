import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { publicReportSnapshot } from './standalone-report.mjs';

// Import integrity tests, not an audit of the supplied financial conclusions.
const root = path.dirname(fileURLToPath(import.meta.url));
const site = process.env.SITE_OUTPUT_DIR ? path.resolve(process.env.SITE_OUTPUT_DIR)
  : path.resolve(root, fs.existsSync(path.resolve(root, '../docs/index.html')) ? '../docs' : '..');
const posts = JSON.parse(fs.readFileSync(path.join(root, 'posts.json'), 'utf8'));
const reports = posts.filter(p => p.seriesSlug === 'taolao-research');
assert.equal(reports.length, 11);
assert.deepEqual(reports.slice(0, 2).map(p => [p.slug, p.number]), [['baofeng-energy', '01'], ['sf-holding', '02']]);
assert.deepEqual(reports.map(p => p.number), Array.from({length: 11}, (_, i) => String(i + 1).padStart(2, '0')));
assert.deepEqual([...new Set(posts.map(p => p.seriesSlug))], ['flow-matching', 'vln-voyager', 'taolao-research']);

function blocks(html, tag) {
  return [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi'))].map(m => m[0]);
}
function markup(html) { return html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<!--[\s\S]*?-->/g, ''); }
function ids(html) {
  const all = [...markup(html).matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]);
  assert.equal(all.length, new Set(all).size, 'IDs must be unique');
  return new Set(all);
}
function body(html) {
  return blocks(html, 'body')[0]
    .replace(/<nav class="blog-context"[\s\S]*?<\/nav>/, '')
    .replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/, '').replace(/>\s+</g, '><').trim();
}
let references = 0;
function check(file, html) {
  assert.doesNotMatch(html, /file:\/\/|\/Users\/|\/home\/|\/private\/|localhost|127\.0\.0\.1/i);
  ids(html);
  const refs = [...markup(html).matchAll(/\b(?:href|src|action|poster)=["']([^"']+)["']/g)].map(m => m[1]);
  for (const ref of refs) {
    assert.doesNotMatch(ref, /^(?:javascript|file):/i);
    if (/^(?:https?:|mailto:|data:|\/\/)/i.test(ref)) continue;
    const url = new URL(ref, `https://test.invalid/${path.relative(site, file)}`);
    let target = path.resolve(site, '.' + decodeURIComponent(url.pathname));
    assert.ok(target.startsWith(site + path.sep) || target === site);
    assert.ok(fs.existsSync(target), `${file}: missing ${ref}`);
    if (fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
    assert.ok(fs.existsSync(target), `${ref}: missing index`);
    if (url.hash && target.endsWith('.html')) assert.ok(ids(fs.readFileSync(target, 'utf8')).has(decodeURIComponent(url.hash.slice(1))), `${file}: missing ${ref}`);
    references++;
  }
}
const indexFile = path.join(site, 'blog/index.html');
const seriesFile = path.join(site, 'blog/taolao-research/index.html');
const index = fs.readFileSync(indexFile, 'utf8');
const series = fs.readFileSync(seriesFile, 'utf8');
assert.ok(index.includes(`3 个系列 / ${posts.length} 篇笔记`));
assert.equal(blocks(series, 'h1').length, 1);
assert.match(blocks(series, 'h1')[0], /套牢研究/);
check(indexFile, index); check(seriesFile, series);
let previousPosition = -1;
for (const post of reports) {
  const source = fs.readFileSync(path.join(root, 'content', post.source), 'utf8');
  const file = path.join(site, 'blog', post.seriesSlug, post.slug, 'index.html');
  const article = fs.readFileSync(file, 'utf8');
  assert.equal(post.format, 'standalone-report');
  assert.match(article, new RegExp(`<title>${post.title} · 套牢研究 · shong Tan</title>`));
  assert.equal(blocks(article, 'h1').length, 1);
  assert.ok(blocks(article, 'h1')[0].startsWith(`<h1>${post.title}`));
  assert.equal(blocks(article, 'h1')[0].replace(post.title, ''), blocks(source, 'h1')[0].replace(post.title.replace(/分析$/, ''), ''), 'subtitle preserved');
  assert.equal(body(article), body(source), `${post.title}: complete body, sources, tables and controls preserved`);
  assert.deepEqual(blocks(article, 'script'), blocks(source, 'script'), `${post.title}: original data/runtime preserved verbatim`);
  assert.deepEqual(blocks(article, 'style').filter(s => !s.includes('data-blog-integration')), blocks(source, 'style'));
  assert.equal(blocks(article, 'style').length, blocks(source, 'style').length + 1);
  const context = article.match(/<nav class="blog-context"[\s\S]*?<\/nav>/g);
  assert.equal(context?.length, 1);
  for (const href of ['../../../', '../../', '../']) assert.ok(context[0].includes(`href="${href}"`));
  const liveMarkup = markup(article);
  assert.doesNotMatch(liveMarkup, /<(?:iframe|object|embed|form|base)\b|\bon\w+\s*=/i);
  assert.doesNotMatch(article, /<(?:script|img)\b[^>]*src\s*=/i);
  for (const script of blocks(article, 'script')) {
    const content = script.replace(/^<script\b[^>]*>/i, '').replace(/<\/script>$/i, '');
    if (/^<script\b[^>]*type="application\/json"/i.test(script)) JSON.parse(content);
    else {
      new vm.Script(content, {filename: post.slug + '.js'});
      assert.doesNotMatch(content, /\b(?:fetch|eval|XMLHttpRequest|WebSocket|importScripts)\s*\(|new\s+Function\b|sendBeacon\s*\(|document\.cookie/);
    }
  }
  assert.ok(index.includes(`href="taolao-research/${post.slug}/"`));
  const position = series.indexOf(`href="../taolao-research/${post.slug}/"`);
  assert.ok(position > previousPosition, 'chapter ordering');
  previousPosition = position;
  check(file, article);
  // Optional comparison with the original supplied files. Only machine paths
  // may differ; original reports remain untouched by the import process.
  if (process.env.STOCK_SOURCE_DIR) {
    const raw = fs.readFileSync(path.join(process.env.STOCK_SOURCE_DIR, post.importFilename), 'utf8');
    assert.equal(source, publicReportSnapshot(raw), `${post.title}: latest input snapshot`);
    const json = s => JSON.parse(s.match(/<script\b[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/i)[1]);
    const normalize = x => Array.isArray(x) ? x.map(normalize) : x && typeof x === 'object'
      ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, normalize(v)]))
      : typeof x === 'string' && /^\/(Users|home|private)\//.test(x) ? path.posix.basename(x) : x;
    assert.deepEqual(json(source), normalize(json(raw)), `${post.title}: financial data unchanged`);
  }
}
assert.equal(publicReportSnapshot('<script type="application/json">{"file":"/Users/example/report.pdf","url":"https://example.org/a.pdf","n":123}</script>'), '<script type="application/json">{"file":"report.pdf","url":"https://example.org/a.pdf","n":123}</script>');
console.log(`Stock blog checks passed: ${reports.length} reports; bodies, data, scripts and styles preserved; ${references} local links checked.`);
