import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const siteDir = process.env.SITE_OUTPUT_DIR
  ? path.resolve(process.env.SITE_OUTPUT_DIR)
  : path.resolve(toolsDir, fs.existsSync(path.resolve(toolsDir, "../docs/index.html")) ? "../docs" : "..");
const blogDir = path.join(siteDir, "blog");
const require = createRequire(import.meta.url);
const model = require(path.join(blogDir, "flow-visuals.js"));
const { gaussian, normalCdf, affineState, continuityState, trainingState, densityGeometry, lossGeometry } = model;
let checks = 0;
function near(actual, expected, tolerance, label) {
  assert.ok(Number.isFinite(actual), `${label}: non-finite result ${actual}`);
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: expected ${expected} ± ${tolerance}, got ${actual}`);
  checks += 1;
}
function integrate(fn, a, b, steps = 1000) {
  assert.equal(steps % 2, 0, "Simpson integration requires an even step count");
  const h = (b - a) / steps;
  let total = fn(a) + fn(b);
  for (let i = 1; i < steps; i += 1) total += (i % 2 ? 4 : 2) * fn(a + i * h);
  return total * h / 3;
}

near(gaussian(0), 1 / Math.sqrt(2 * Math.PI), 1e-14, "standard Gaussian peak");
near(normalCdf(0), 0.5, 1e-14, "Gaussian CDF at zero");
near(normalCdf(1), 0.8413447460685429, 1e-13, "Gaussian CDF at one");
near(normalCdf(2), 0.9772498680518208, 1e-13, "Gaussian CDF at two");
for (const t of [0, 0.1, 0.25, 0.5, 0.75, 1]) {
  const state = affineState(t);
  near(state.mean, 2 * t, 1e-14, `affine mean at t=${t}`);
  near(state.sigma, 1 + t, 1e-14, `affine standard deviation at t=${t}`);
  near(state.particle, 1 + 3 * t, 1e-14, `fixed particle position at t=${t}`);
  near((state.particle + 2) / (1 + t), state.velocity, 1e-14, `Eulerian velocity along the particle at t=${t}`);
  near(state.velocity, 3, 1e-14, `fixed particle speed at t=${t}`);
  const totalMass = integrate((x) => gaussian(x, state.mean, state.sigma), state.mean - 10 * state.sigma, state.mean + 10 * state.sigma);
  near(totalMass, 1, 1e-10, `transported Gaussian normalization at t=${t}`);
  for (const x of [-2, 0, 1, 4]) {
    const inverse = (x - 2 * t) / (1 + t);
    near(gaussian(x, state.mean, state.sigma), gaussian(inverse) / (1 + t), 1e-14, `change of variables at t=${t}, x=${x}`);
  }

  const continuity = continuityState(t);
  const intervalMass = integrate((x) => gaussian(x, state.mean, state.sigma), 0, 2);
  near(continuity.mass, intervalMass, 1e-11, `fixed-interval mass at t=${t}`);
  near(continuity.leftFlux, gaussian(0, state.mean, state.sigma) * 2 / (1 + t), 1e-14, `left boundary flux at t=${t}`);
  near(continuity.rightFlux, gaussian(2, state.mean, state.sigma) * 4 / (1 + t), 1e-14, `right boundary flux at t=${t}`);
  near(continuity.rate, continuity.leftFlux - continuity.rightFlux, 1e-14, `flux balance at t=${t}`);
  const h = 1e-4;
  const massDerivative = (continuityState(t + h).mass - continuityState(t - h).mass) / (2 * h);
  near(massDerivative, continuity.rate, 1e-6, `continuity finite difference at t=${t}`);
  assert.ok(continuity.mass >= 0 && continuity.mass <= 1, "interval probability must lie in [0, 1]");
  assert.ok(!/NaN|Infinity|undefined/.test(JSON.stringify(densityGeometry(state.mean, state.sigma))), "SVG density geometry must remain finite");
}
assert.ok(continuityState(0).rate > 0, "the interval initially gains probability");
assert.ok(continuityState(0.5).rate < 0, "the interval loses probability at t=0.5");

const initial = trainingState(0);
near(initial.sigma, 1, 1e-14, "initial CNF standard deviation");
near(initial.loss, 2.9189385332046727, 1e-13, "initial population NLL");
near(initial.gradient, -3, 1e-14, "initial population gradient");
const firstTheta = -0.05 * initial.gradient;
near(firstTheta, 0.15, 1e-14, "first gradient update");
assert.ok(trainingState(firstTheta).loss < initial.loss, "one gradient update must decrease NLL");
for (const theta of [-0.5, 0, 0.5, Math.log(2), 1, 1.5]) {
  const h = 1e-5;
  const lossDerivative = (trainingState(theta + h).loss - trainingState(theta - h).loss) / (2 * h);
  near(lossDerivative, trainingState(theta).gradient, 1e-7, `NLL gradient finite difference at theta=${theta}`);
}
let theta = 0;
for (let i = 0; i < 100; i += 1) {
  const state = trainingState(theta);
  const next = theta - 0.05 * state.gradient;
  assert.ok(trainingState(next).loss <= state.loss + 1e-12, `NLL must not increase on update ${i + 1}`);
  theta = next;
}
near(theta, Math.log(2), 2e-5, "100-step convergence to ln 2");
near(trainingState(Math.log(2)).sigma, 2, 1e-14, "optimal standard deviation");
near(trainingState(Math.log(2)).gradient, 0, 1e-14, "stationary gradient at the optimum");
near(trainingState(Math.log(2)).loss, 2.112085713764618, 1e-13, "optimal population NLL");
assert.ok(!/NaN|Infinity|undefined/.test(lossGeometry()), "SVG loss geometry must remain finite");

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const decodeHtml = (value) => value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const posts = JSON.parse(fs.readFileSync(path.join(toolsDir, "posts.json"), "utf8"));
const post = posts.find((entry) => entry.slug === "flow-random-variables-deterministic-markov");
assert.ok(post, "the existing first Flow article must remain in posts.json");
assert.equal(post.title, "从 Flow ，Velocity Field 到 CNF", "article metadata must use the requested title");
const articleFile = path.join(blogDir, post.seriesSlug, post.slug, "index.html");
const article = fs.readFileSync(articleFile, "utf8");
assert.ok(article.includes(`<h1>${escapeHtml(post.title)}</h1>`), "article h1 must match its metadata");
assert.ok(article.includes(`<title>${escapeHtml(post.title)} · 谭圣涵</title>`), "document title must match its metadata");
const demos = [...article.matchAll(/<figure\b[^>]*\bdata-cnf-demo="([^"]+)"/g)].map((match) => match[1]);
assert.deepEqual(demos.sort(), ["affine", "continuity", "training"], "article must contain exactly three analytic figures");
for (const name of ["flow-visuals.css", "flow-visuals.js"]) assert.ok(article.includes(name), `article must load ${name}`);
for (const id of ["cnf-affine-time", "cnf-continuity-time", "cnf-theta"]) assert.ok(article.includes(`id="${id}"`), `missing accessible control ${id}`);

const files = [path.join(blogDir, "index.html"), path.join(blogDir, post.seriesSlug, "index.html"), articleFile];
const inspectedAssets = new Set();
const localTargets = new Set();
function checkReference(raw, owner) {
  const reference = decodeHtml(raw.trim());
  if (!reference || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(reference)) return;
  const pathname = decodeURIComponent(reference.split(/[?#]/, 1)[0]);
  if (!pathname) return;
  let target = pathname.startsWith("/") ? path.join(siteDir, pathname.slice(1)) : path.resolve(path.dirname(owner), pathname);
  assert.ok(fs.existsSync(target), `missing local reference ${reference} from ${path.relative(siteDir, owner)}`);
  if (fs.statSync(target).isDirectory()) target = path.join(target, "index.html");
  assert.ok(fs.existsSync(target) && fs.statSync(target).isFile(), `missing local file ${target}`);
  localTargets.add(target);
  if (path.extname(target) === ".css" && !inspectedAssets.has(target)) {
    inspectedAssets.add(target);
    const css = fs.readFileSync(target, "utf8");
    for (const match of css.matchAll(/url\(\s*["']?([^\s)"']+)["']?\s*\)/g)) checkReference(match[1], target);
  }
}
for (const file of files) {
  const html = fs.readFileSync(file, "utf8");
  assert.ok(html.includes(escapeHtml(post.title)), `updated title missing from ${path.relative(siteDir, file)}`);
  assert.ok(!/MATH(?:BLOCK|INLINE)\d+TOKEN|<!--\s*(?:affine-demo|continuity-demo|cnf-training-demo|flow-demo|concept-strip|action-diagram)\s*-->/.test(html), `unreplaced build placeholder in ${file}`);
  assert.ok(!/class="[^"]*katex-error/.test(html), `KaTeX error in ${file}`);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, new Set(ids).size, `duplicate HTML id in ${file}`);
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) checkReference(match[1], file);
}

console.log(`PASS · ${checks} numerical comparisons; continuity finite differences; 100 decreasing gradient updates.`);
console.log(`PASS · 3 generated pages; requested title; 3 analytic figures; unique IDs; ${localTargets.size} local files and assets.`);
console.log(`Site layout: ${siteDir}`);
