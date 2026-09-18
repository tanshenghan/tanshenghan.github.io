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
const { gaussian, normalCdf, affineState, continuityState, continuityStep, trainingState, densityGeometry, lossGeometry } = model;
const { gaussianState, geometry: gaussianGeometry, density: gaussianDensity, sampleOrigins } = require(path.join(blogDir, "gaussian-demo.js"));
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

assert.equal(sampleOrigins.length, 9, "the first Gaussian figure must retain nine fixed particles");
assert.ok(sampleOrigins.every(Number.isFinite), "particle origins must be finite");
assert.equal(new Set(sampleOrigins).size, sampleOrigins.length, "fixed particle origins must be distinct");
for (const t of [0, 0.1, 0.25, 0.5, 0.75, 1]) {
  const state = gaussianState(t);
  near(state.t, t, 1e-14, `Gaussian slider time at t=${t}`);
  near(state.sigma, 1 + t, 1e-14, `Gaussian scaling standard deviation at t=${t}`);
  near(state.peak, 1 / (Math.sqrt(2 * Math.PI) * (1 + t)), 1e-14, `Gaussian scaling peak at t=${t}`);
  near(state.mass, 1, 1e-14, `Gaussian displayed mass at t=${t}`);
  near(gaussianDensity(0, state.sigma), state.peak, 1e-14, `Gaussian density peak agrees with displayed value at t=${t}`);
  near(integrate((x) => gaussianDensity(x, state.sigma), -10 * state.sigma, 10 * state.sigma), 1, 1e-10, `Gaussian scaling normalization at t=${t}`);
  near(integrate((x) => x * x * gaussianDensity(x, state.sigma), -10 * state.sigma, 10 * state.sigma), state.sigma ** 2, 1e-9, `Gaussian scaling variance at t=${t}`);
  for (const x of [-4, -1, 0, 1, 4]) {
    near(gaussianDensity(x, state.sigma), gaussianDensity(x / (1 + t), 1) / (1 + t), 1e-14, `Gaussian change of variables at t=${t}, x=${x}`);
    near(gaussianDensity(x, state.sigma), gaussianDensity(-x, state.sigma), 1e-14, `Gaussian symmetry at t=${t}, x=${x}`);
  }
  const shape = gaussianGeometry(t);
  assert.ok(typeof shape.line === "string" && shape.line.startsWith("M"), "Gaussian line must be a nonempty SVG path");
  assert.ok(typeof shape.area === "string" && /[zZ]\s*$/.test(shape.area), "Gaussian density fill must be a closed SVG path");
  assert.ok(!/NaN|Infinity|undefined/.test(JSON.stringify(shape)), "Gaussian SVG geometry must remain finite");
  assert.equal(shape.particles.length, sampleOrigins.length, "dragging must not resample or drop particles");
  shape.particles.forEach((particle, index) => {
    near(particle.x, sampleOrigins[index] * (1 + t), 1e-14, `fixed Gaussian particle ${index} at t=${t}`);
    assert.ok(Number.isFinite(particle.cx) && Number.isFinite(particle.cy), "particle SVG coordinates must be finite");
  });
}
near(gaussianState(1).sigma / gaussianState(0).sigma, 2, 1e-14, "Gaussian stretching doubles its standard deviation");
near(gaussianState(1).peak / gaussianState(0).peak, 0.5, 1e-14, "Gaussian stretching halves its peak");

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

for (const t of [0, 0.2, 0.5, 0.8]) {
  for (const dt of [0.01, 0.1, 0.2]) {
    const step = continuityStep(t, dt);
    const currentDensity = (x) => gaussian(x, 2 * t, 1 + t);
    const nextDensity = (x) => gaussian(x, 2 * (t + dt), 1 + t + dt);
    near(step.dt, dt, 1e-14, `continuity step duration at t=${t}, dt=${dt}`);
    near(step.leftDensity, currentDensity(0), 1e-14, `left rectangle height at t=${t}, dt=${dt}`);
    near(step.rightDensity, currentDensity(2), 1e-14, `right rectangle height at t=${t}, dt=${dt}`);
    near(step.leftSpeed, 2 / (1 + t), 1e-14, `left rectangle speed at t=${t}, dt=${dt}`);
    near(step.rightSpeed, 4 / (1 + t), 1e-14, `right rectangle speed at t=${t}, dt=${dt}`);
    near(step.leftWidth, step.leftSpeed * dt, 1e-14, `left rectangle width at t=${t}, dt=${dt}`);
    near(step.rightWidth, step.rightSpeed * dt, 1e-14, `right rectangle width at t=${t}, dt=${dt}`);
    near(step.leftMass, step.leftDensity * step.leftWidth, 1e-14, `left first-order rectangle area at t=${t}, dt=${dt}`);
    near(step.rightMass, step.rightDensity * step.rightWidth, 1e-14, `right first-order rectangle area at t=${t}, dt=${dt}`);
    near(step.deltaApprox, step.leftMass - step.rightMass, 1e-14, `first-order net rectangle mass at t=${t}, dt=${dt}`);
    near(step.deltaApprox, step.rate * dt, 1e-14, `instantaneous net flux times dt at t=${t}, dt=${dt}`);
    const integratedChange = integrate(nextDensity, 0, 2) - integrate(currentDensity, 0, 2);
    near(step.deltaExact, integratedChange, 1e-11, `exact finite interval mass change at t=${t}, dt=${dt}`);
    near(step.finiteRate, step.deltaExact / dt, 1e-13, `finite-time difference quotient at t=${t}, dt=${dt}`);

    // The exact departure strip differs from the first-order u_t(boundary) * dt rectangle.
    const departurePoint = (boundary) => boundary - (boundary + 2) * dt / (1 + t + dt);
    const forwardMap = (x) => x + (x + 2) * dt / (1 + t);
    const leftDeparture = departurePoint(0);
    const rightDeparture = departurePoint(2);
    near(forwardMap(leftDeparture), 0, 1e-14, `exact left crossing trajectory at t=${t}, dt=${dt}`);
    near(forwardMap(rightDeparture), 2, 1e-14, `exact right crossing trajectory at t=${t}, dt=${dt}`);
    assert.ok(leftDeparture < 0, "the inflow departure strip lies outside the fixed interval, left of a");
    assert.ok(rightDeparture > 0 && rightDeparture < 2, "the outflow departure strip lies inside the interval, left of b");
    const exactInflow = integrate(currentDensity, leftDeparture, 0);
    const exactOutflow = integrate(currentDensity, rightDeparture, 2);
    near(step.deltaExact, exactInflow - exactOutflow, 1e-11, `exact crossing-strip probability conservation at t=${t}, dt=${dt}`);
  }
  // Check the small-step limit directly; do not assume globally monotone approximation error.
  for (const dt of [1e-4, 1e-5, 1e-6]) {
    const step = continuityStep(t, dt);
    near(step.finiteRate, step.rate, 3 * dt, `difference quotient approaches instantaneous flux at t=${t}, dt=${dt}`);
  }
}

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
assert.equal([...article.matchAll(/<figure\b[^>]*\bclass="[^"]*\bgaussian-demo\b[^"]*"/g)].length, 1, "article must include exactly one first Gaussian drag figure");
assert.ok(article.includes("gaussian-demo.js"), "article must load the first Gaussian figure runtime");
for (const id of ["flow-time", "flow-play", "flow-sigma", "flow-density"]) assert.ok(article.includes(`id="${id}"`), `missing Gaussian control or metric ${id}`);
const demos = [...article.matchAll(/<figure\b[^>]*\bdata-cnf-demo="([^"]+)"/g)].map((match) => match[1]);
assert.deepEqual(demos.sort(), ["affine", "continuity", "training"], "article must contain exactly three analytic figures");
for (const name of ["flow-visuals.css", "flow-visuals.js"]) assert.ok(article.includes(name), `article must load ${name}`);
for (const id of ["cnf-affine-time", "cnf-continuity-time", "cnf-continuity-dt", "cnf-theta"]) assert.ok(article.includes(`id="${id}"`), `missing accessible control ${id}`);
const continuityFigure = article.match(/<figure\b[^>]*\bdata-cnf-demo="continuity"[^>]*>([\s\S]*?)<\/figure>/)?.[1];
assert.ok(continuityFigure, "the continuity illustration must be present");
for (const side of ["left", "right"]) {
  assert.match(continuityFigure, new RegExp(`<rect\\b[^>]*class="cnf-slab ${side}"[^>]*data-part="${side}-slab"`), `missing ${side} first-order probability rectangle`);
}
assert.ok(continuityFigure.includes('class="cnf-proof"'), "continuity figure must connect the illustration to the integral and local conservation equations");
assert.ok(continuityFigure.includes("任意固定区间"), "the local continuity equation must be justified for arbitrary fixed intervals");
assert.ok(continuityFigure.includes("一阶近似") && continuityFigure.includes("精确穿越概率"), "the figure must distinguish rectangle approximations from exact finite-time crossing probabilities");
for (const key of ["left-factors", "right-factors", "left-mass", "right-mass", "delta-approx", "finite-rate", "rate"]) {
  assert.ok(continuityFigure.includes(`data-readout="${key}"`), `missing continuity derivation readout ${key}`);
}
const trainingFigure = article.match(/<figure\b[^>]*\bdata-cnf-demo="training"[^>]*>([\s\S]*?)<\/figure>/)?.[1];
assert.ok(trainingFigure?.includes('class="cnf-training-panels"'), "training charts must share a side-by-side panel container");
assert.equal([...trainingFigure.matchAll(/<section\b[^>]*class="cnf-training-panel"/g)].length, 2, "training figure must have exactly two chart panels");
for (const heading of ["training-density-heading", "training-loss-heading"]) {
  assert.ok(trainingFigure.includes(`id="${heading}"`), `missing named training panel ${heading}`);
}
const visualCss = fs.readFileSync(path.join(blogDir, "flow-visuals.css"), "utf8");
assert.match(visualCss, /\.cnf-training-panels\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/, "training charts must use two equal columns at desktop widths");
assert.match(visualCss, /\.cnf-slab\s*\{[^}]*fill:\s*var\(--blue\)/, "inflow rectangle must use the blue accent");
assert.match(visualCss, /\.cnf-slab\.right\s*\{[^}]*fill:\s*var\(--outflow\)/, "outflow rectangle must use the distinct outflow accent");

function hasTrailingMathPeriod(tex) {
  // Invisible delimiters are mathematical syntax, not sentence punctuation.
  const visibleTex = tex.replace(/\\(?:left|right|middle)\s*\./g, "");
  return /(?<!\\)\.(?=(?:\s|[}\])]|\\end\{[a-zA-Z*]+\}|\\[,;! ])*$)/.test(visibleTex);
}
for (const tex of ["x=1.", String.raw`\boxed{x=1.}`, String.raw`\begin{aligned}x&=1.\end{aligned}`]) {
  assert.ok(hasTrailingMathPeriod(tex), `math punctuation detector must reject ${tex}`);
}
for (const tex of ["x=1.25", String.raw`\left.\frac{df}{dx}\right|_{x=0}`, String.raw`\left\{x>0\right.`, String.raw`x_1,\ldots,x_n`, String.raw`x\.`]) {
  assert.ok(!hasTrailingMathPeriod(tex), `math punctuation detector must preserve ${tex}`);
}
const articleSource = fs.readFileSync(path.join(toolsDir, "content/flow-foundations.md"), "utf8");
const sourceFormulas = [...articleSource.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g)];
assert.ok(sourceFormulas.length > 50, "source formula audit must inspect the complete article");
for (const match of sourceFormulas) {
  const tex = match[1] ?? match[2];
  assert.ok(!hasTrailingMathPeriod(tex), `formula still ends with a sentence period: ${tex.trim()}`);
}

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

console.log(`PASS · ${checks} numerical comparisons; Gaussian mass and fixed-particle transport; continuity rectangles, exact crossing conservation and small-step limits; 100 decreasing gradient updates.`);
console.log(`PASS · 3 generated pages; requested title; Gaussian drag figure and 3 analytic figures; continuity derivation and desktop training columns; unique IDs; ${localTargets.size} local files and assets.`);
console.log(`PASS · ${sourceFormulas.length} source formulas without trailing sentence periods; decimals and invisible delimiters preserved.`);
console.log(`Site layout: ${siteDir}`);
