import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(toolsDir, fs.existsSync(path.resolve(toolsDir, "../docs/index.html")) ? "../docs" : "..");
const articleFile = path.join(siteDir, "blog/company-research/baofeng-energy/index.html");
const seriesFile = path.join(siteDir, "blog/company-research/index.html");
const article = fs.readFileSync(articleFile, "utf8");
const series = fs.readFileSync(seriesFile, "utf8");

assert.match(series, /<h1>企业研究<\/h1>/, "company research series must exist");
assert.match(article, /宝丰能源：产能、价差与自由现金流/, "article title must be rendered");
const source = fs.readFileSync(path.join(toolsDir, "content/baofeng-energy.html"), "utf8");
assert.equal(article, source, "publishing must preserve the edited HTML exactly");
assert.match(article, /上市以来日频PB估值/, "edited PB chart must be preserved");
assert.match(article, /推理估值：利润，分红和PB/, "edited valuation section must be preserved");
const ids = new Set([...article.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
for (const m of article.matchAll(/href="#([^"]+)"/g)) {
  // The edited snapshot retains hidden navigation entries for removed sections.
  if (["section-7", "section-8", "section-9"].includes(m[1])) {
    assert.ok(article.includes(`a[href="#${m[1]}"]`), "removed section navigation must remain hidden");
    continue;
  }
  assert.ok(ids.has(m[1]), `Missing anchor: ${m[1]}`);
}
console.log("Company research checks passed: exact edited HTML, PB chart, valuation section and local anchors.");

assert.match(article, /coal-supply-base-map\.png/, "coal supply map must remain linked");
assert.deepEqual(
  fs.readFileSync(path.join(siteDir, "blog/company-research/baofeng-energy/coal-supply-base-map.png")),
  fs.readFileSync(path.join(toolsDir, "content/baofeng-energy/coal-supply-base-map.png")),
  "published map must match its source"
);
