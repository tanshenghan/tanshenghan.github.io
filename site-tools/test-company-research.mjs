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
assert.match(article, /2026 前三季归母净利/, "key financial evidence must be rendered");
assert.match(article, /悲观[\s\S]*基准[\s\S]*乐观/, "valuation scenarios must be rendered");
assert.match(article, /2019[\s\S]*2026前三季/, "listing-to-date operating history must be rendered");
assert.match(article, /差异化分红/, "differential dividends must be explained");
assert.doesNotMatch(article, /技术面|MACD|RSI/, "technical analysis must be removed");
assert.match(article, /免责声明/, "investment disclaimer must be rendered");
assert.equal((article.match(/<h2 id="section-/g) || []).length, 9, "article should have nine auditable sections");
console.log("Company research checks passed: history, capacity, differential dividends, scenarios and disclaimer are present; technical analysis is absent.");
