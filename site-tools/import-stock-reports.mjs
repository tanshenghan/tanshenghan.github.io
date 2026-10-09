import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { publicReportSnapshot } from './standalone-report.mjs';

// Explicit input directory only. Do not recursively import research or backups.
const input = process.argv[2];
assert.ok(input, 'Usage: node import-stock-reports.mjs <report-directory>');
const root = path.dirname(fileURLToPath(import.meta.url));
const posts = JSON.parse(fs.readFileSync(path.join(root, 'posts.json'), 'utf8'));
for (const post of posts.filter(p => p.seriesSlug === 'taolao-research')) {
  const raw = fs.readFileSync(path.join(input, post.importFilename), 'utf8');
  const content = publicReportSnapshot(raw);
  assert.doesNotMatch(content, /file:\/\/|\/Users\/|\/private\/|\/home\//);
  const output = path.join(root, 'content', post.source);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, content);
  console.log(`${post.number} ${post.title}: ${Buffer.byteLength(content)} bytes`);
}
