import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const site = process.env.SITE_OUTPUT_DIR ? path.resolve(process.env.SITE_OUTPUT_DIR) : path.resolve(toolsDir, fs.existsSync(path.resolve(toolsDir, '../docs/index.html')) ? '../docs' : '..');
const posts = JSON.parse(fs.readFileSync(path.join(toolsDir, 'posts.json'), 'utf8'));
const chapters = posts.filter(p => p.seriesSlug === 'vln-voyager');
assert.deepEqual(chapters.map(p => [p.number, p.title]), [['01', 'Agentic VLN'], ['02', '端到端VLN']]);
const post = chapters[1];
const source = fs.readFileSync(path.join(toolsDir, 'content', post.source), 'utf8');
const file = path.join(site, 'blog/vln-voyager/e2e-vln/index.html');
const html = fs.readFileSync(file, 'utf8');
const data = s => JSON.parse(s.match(/<script id="paper-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
assert.deepEqual(data(html), data(source), 'preserve the entire searchable/exportable dataset');
assert.equal(data(html).length, 25);
assert.equal(data(html).reduce((n,p) => n + p.results.length, 0), 74);
const normalize = s => s.replace(/\s+(?:loading|decoding)="[^"]*"/g, '');
const articles = s => [...s.matchAll(/<article\b[\s\S]*?<\/article>/g)].map(m => normalize(m[0]));
assert.deepEqual(articles(html), articles(source), 'retain every paper, figure, citation and training explanation');
assert.equal(articles(html).length, 25);
const tables = s => [...s.matchAll(/<table\b[\s\S]*?<\/table>/g)].map(m => m[0]);
assert.deepEqual(tables(html), tables(source), 'preserve experimental and architecture tables');
assert.equal((html.match(/<img\b/g) || []).length, 23);
assert.equal((html.match(/<h1\b/g) || []).length, 1);
assert.match(html, /<h1>端到端VLN<\/h1>/);
assert.match(html, /PART 02/);
assert.match(html, /href="\.\.\/agentic-vln\/"/);
assert.doesNotMatch(html, /href="vln-paper-catalog\.html"|file:\/\/|\/Users\/|localhost|127\.0\.0\.1/);
const runtime = [...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].find(m => !m[1].includes('application/json'))[2];
assert.ok(fs.readFileSync(path.join(path.dirname(file), 'catalog.js'), 'utf8').includes(runtime), 'preserve reviewed UI and download behavior');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(new Set(ids).size, ids.length, 'unique IDs');
for (const id of ['paper-search','year-filter','architecture-filter','code-filter','benchmark-filter','split-filter','directory-toggle','directory-search','download-json','download-csv']) assert.ok(ids.includes(id));
let resources = 0;
for (const m of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
  const ref = m[1];
  if (/^(https?:|data:|mailto:)/.test(ref)) continue;
  const url = new URL(ref, 'https://test.invalid/blog/vln-voyager/e2e-vln/index.html');
  let local = path.join(site, decodeURIComponent(url.pathname));
  assert.ok(fs.existsSync(local), `missing link: ${ref}`);
  if (fs.statSync(local).isDirectory()) local = path.join(local, 'index.html');
  assert.ok(fs.existsSync(local), `missing destination: ${ref}`);
  if (url.hash) {
    const target = fs.readFileSync(local, 'utf8');
    assert.ok(target.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`), `broken anchor: ${ref}`);
  }
  resources++;
}
for (const rel of ['blog/index.html','blog/vln-voyager/index.html']) {
  const page = fs.readFileSync(path.join(site, rel), 'utf8');
  assert.ok(page.indexOf('<h3>Agentic VLN</h3>') < page.indexOf('<h3>端到端VLN</h3>'));
  assert.ok(page.includes('vln-voyager/e2e-vln/'));
}
console.log(`E2E VLN passed: Part 02, 25 intact articles, 74 results, 23 attributed figures, searchable/exportable data, ${resources} local links.`);
