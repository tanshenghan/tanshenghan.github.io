import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import katex from "katex";

// Share the exact analytic model with the browser, in either repository layout.
const dir = path.dirname(fileURLToPath(import.meta.url));
const runtime = ["../docs/blog/flow-visuals.js", "../blog/flow-visuals.js"].map((p) => path.resolve(dir, p)).find((p) => fs.existsSync(p));
if (!runtime) throw new Error("Missing blog/flow-visuals.js");
const require = createRequire(import.meta.url);
const { gaussian, affineState, continuityStep, trainingState, plots, px, py, densityGeometry, lossGeometry } = require(runtime);
const f = (n, digits = 3) => n.toFixed(digits);
const signed = (n, digits = 3) => (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(digits);

function axes(plot, xTicks, yTicks, yLabel = "pₜ(x)") {
  const grid = yTicks.filter((v) => v > (plot.ymin || 0)).map((v) => `<line x1="${plot.left}" x2="${plot.right}" y1="${py(v, plot)}" y2="${py(v, plot)}"/>`).join("");
  const xs = xTicks.map((v) => `<text x="${px(v, plot)}" y="${plot.bottom + 23}" text-anchor="middle">${v}</text>`).join("");
  const ys = yTicks.map((v) => `<text x="${plot.left - 9}" y="${py(v, plot) + 5}" text-anchor="end">${v}</text>`).join("");
  return `<g class="cnf-grid">${grid}</g><path class="cnf-axis" d="M${plot.left} ${plot.top}V${plot.bottom}H${plot.right}"/><g class="cnf-ticks">${xs}${ys}<text x="${plot.left}" y="15">${yLabel}</text><text x="${plot.right + 10}" y="${plot.bottom + 4}">${yLabel === "L(θ)" ? "θ" : "x"}</text></g>`;
}
function densityPaths(mean, sigma, plot, referenceMean = 0, referenceSigma = 1) {
  const model = densityGeometry(mean, sigma, plot);
  const reference = densityGeometry(referenceMean, referenceSigma, plot);
  return `<path class="cnf-area" data-part="density-area" d="${model.area}"/><path class="cnf-reference" d="${reference.line}"/><path class="cnf-curve" data-part="density" d="${model.line}"/>`;
}
function slider(id, label, initial, min = 0, max = 1, step = 0.01) {
  return `<div class="cnf-controls"><label for="${id}">${label}</label><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${initial}" disabled><output for="${id}" data-readout="${id === "cnf-theta" ? "theta" : "time"}">${f(initial, id === "cnf-theta" ? 3 : 2)}</output></div>`;
}
const metric = (label, key, value) => `<div><dt>${label}</dt><dd data-readout="${key}">${value}</dd></div>`;
const legend = (labels) => `<div class="cnf-legend">${labels.map(([style, label]) => `<span><i class="${style}" aria-hidden="true"></i>${label}</span>`).join("")}</div>`;
const noScript = '<noscript><p class="cnf-no-script">当前为静态解析示例；启用 JavaScript 后可拖动滑块探索。</p></noscript>';

const a = affineState(0.5);
const c = continuityStep(0.5, 0.15);
const tr = trainingState(0);
const plot = plots.transport;
const initialPosition = px(1, plot);
const particlePosition = px(a.particle, plot);

const affine = `<figure class="cnf-figure" data-cnf-demo="affine" aria-labelledby="affine-title">
<figcaption><span class="eyebrow">ANALYTIC EXAMPLE · 01</span><h3 id="affine-title">同一个 Flow，同时改变位置与分布</h3><p>ψₜ(x₀) = (1+t)x₀ + 2t，X₀ ∼ N(0, 1)。拖动 t，观察平移与拉伸。</p></figcaption>
${legend([["reference", "初始密度 p₀"], ["current", "当前密度 pₜ"], ["dot", "固定粒子 x₀ = 1"]])}
<svg class="cnf-chart" viewBox="0 0 520 260" role="img" aria-labelledby="affine-svg-title"><title id="affine-svg-title">高斯分布均值为 2t，标准差为 1+t；初值为 1 的粒子位置为 1+3t</title>${axes(plot, [-4, -2, 0, 2, 4, 6, 8], [0, 0.2, 0.4])}${densityPaths(a.mean, a.sigma, plot)}<line class="cnf-mean" data-part="mean" x1="${px(a.mean, plot)}" x2="${px(a.mean, plot)}" y1="24" y2="197"/><line class="cnf-particle-track" x1="45" x2="495" y1="242" y2="242"/><line class="cnf-particle-trail" data-part="particle-trail" x1="${initialPosition}" x2="${particlePosition}" y1="242" y2="242"/><circle class="cnf-particle-origin" cx="${initialPosition}" cy="242" r="4"/><circle class="cnf-particle" data-part="particle" cx="${particlePosition}" cy="242" r="6"/></svg>
${slider("cnf-affine-time", "时间 t", a.t)}
<dl class="cnf-metrics">${metric("均值 2t", "mean", f(a.mean, 2))}${metric("标准差 1+t", "sigma", f(a.sigma, 2))}${metric("粒子位置 1+3t", "particle", f(a.particle, 2))}${metric("粒子速度", "velocity", "3.00")}</dl>
<p class="cnf-state" data-readout="state" aria-live="polite" aria-atomic="true">t = 0.50：均值 1.00，标准差 1.50；初值为 1 的粒子到达 2.50，沿途速度始终为 3。</p><p class="cnf-note">蓝色虚线标记当前均值；底部圆点跟踪同一个粒子。速度场 uₜ(x) = (x+2)/(1+t)，代入它的轨迹 x = 1+3t 后，速度恒为 3。曲线按固定横轴截取，完整高斯分布仍延伸至两端无穷。</p>${noScript}</figure>`;

const cp = plots.continuity;
const interval = densityGeometry(c.mean, c.sigma, cp, 0, 2);
const math = (tex) => '<div class="cnf-proof-equation" tabindex="0" role="region" aria-label="守恒公式，可横向滚动">' + katex.renderToString(tex, { displayMode: true, throwOnError: true, strict: "error", output: "htmlAndMathml" }) + '</div>';
function slab(side, boundary) {
  const left = px(boundary - c[side + "Width"], cp);
  const right = px(boundary, cp);
  const top = py(c[side + "Density"], cp);
  return '<rect class="cnf-slab ' + side + '" data-part="' + side + '-slab" x="' + left + '" y="' + top + '" width="' + (right - left) + '" height="' + (cp.bottom - top) + '"/><circle class="cnf-slab-point ' + side + '" data-part="' + side + '-point" cx="' + right + '" cy="' + top + '" r="4"/><path class="cnf-width ' + side + '" data-part="' + side + '-width" d="M' + left + ' 257v6H' + right + 'v-6"/><text class="cnf-width-label ' + side + '" x="' + right + '" y="285" text-anchor="middle">uₜ(' + (side === "left" ? "a" : "b") + ')Δt</text>';
}
function boundary(x, label, side) {
  const at = px(x, cp);
  return '<line class="cnf-boundary" x1="' + at + '" x2="' + at + '" y1="63" y2="226"/><path class="cnf-flux-arrow ' + side + '" d="M' + (at - 24) + ' 45h48m-7 -6 7 6-7 6"/><text class="cnf-flux-label ' + side + '" x="' + at + '" y="27" text-anchor="middle">' + (side === "left" ? "从 a 流入" : "从 b 流出") + '</text><text class="cnf-boundary-label" x="' + (at + 8) + '" y="246">' + label + '</text>';
}
const continuity = `<figure class="cnf-figure cnf-continuity" data-cnf-demo="continuity" aria-labelledby="continuity-title">
<figcaption><span class="eyebrow">ANALYTIC EXAMPLE · 02</span><h3 id="continuity-title">把一维概率守恒，画成边界上的两个小矩形</h3><p>宽 uₜ(x)Δt × 高 pₜ(x) ≈ 穿过边界的概率质量。固定 [a, b] = [0, 2]，看左端流入与右端流出。</p></figcaption>
<div class="cnf-continuity-panels"><div class="cnf-continuity-visual">
${legend([["reference", "当前密度 pₜ"], ["inflow", "流入的一阶矩形"], ["outflow", "流出的一阶矩形"]])}
<svg class="cnf-chart cnf-flux-chart" viewBox="0 0 640 300" role="img" aria-labelledby="continuity-svg-title"><title id="continuity-svg-title">固定区间零到二：蓝色矩形在左边界外，橙色矩形在右边界内；两个矩形面积是一阶穿越概率近似，箭头均向右</title><g class="cnf-grid">${[0.2, 0.4].map((y) => `<path d="M${cp.left} ${py(y, cp)}H${cp.right}"/>`).join("")}</g><path class="cnf-axis" d="M${cp.left} 55V${cp.bottom}H${cp.right}"/><g class="cnf-ticks">${[0, 0.2, 0.4].map((y) => `<text x="${cp.left - 8}" y="${py(y, cp) + 4}" text-anchor="end">${y}</text>`).join("")}<text x="18" y="43">pₜ(x)</text><text x="606" y="230">x</text></g><path class="cnf-interval" data-part="interval-area" d="${interval.area}"/><path class="cnf-curve" data-part="density" d="${densityGeometry(c.mean, c.sigma, cp).line}"/>${slab("left", 0)}${slab("right", 2)}${boundary(0, "a = 0", "left")}${boundary(2, "b = 2", "right")}</svg>
<p class="cnf-note">两个矩形都在各自边界的左侧，箭头均向右：蓝色从区间外进入，橙色从区间内离开。矩形只是一阶近似，不等于有限 Δt 内的精确穿越概率。</p>
<div class="cnf-flux-controls">${slider("cnf-continuity-time", "观察时刻 t", c.t, 0, 0.8)}<div class="cnf-controls"><label for="cnf-continuity-dt">小时间 Δt</label><input id="cnf-continuity-dt" type="range" min="0.01" max="0.2" step="0.01" value="0.15" disabled><output for="cnf-continuity-dt" data-readout="dt">0.15</output></div></div>
</div><div class="cnf-continuity-detail">
<div class="cnf-slab-factors"><p><strong>流入：高 × 宽</strong><span>pₜ(a) × uₜ(a) × Δt</span><code data-readout="left-factors">${f(c.leftDensity)} × ${f(c.leftSpeed)} × 0.15</code></p><p><strong>流出：高 × 宽</strong><span>pₜ(b) × uₜ(b) × Δt</span><code data-readout="right-factors">${f(c.rightDensity)} × ${f(c.rightSpeed)} × 0.15</code></p></div>
<div class="cnf-balance"><span>流入近似<b data-readout="left-mass">${f(c.leftMass, 5)}</b></span><i aria-hidden="true">−</i><span>流出近似<b data-readout="right-mass">${f(c.rightMass, 5)}</b></span><i aria-hidden="true">=</i><span>净变化的一阶近似<b data-readout="delta-approx">${signed(c.deltaApprox, 5)}</b></span></div>
<div class="cnf-step-limit"><div><span>真实有限时间变化率</span><code>[M(t+Δt) − M(t)] / Δt</code><b data-readout="finite-rate">${signed(c.finiteRate)}</b></div><span class="cnf-limit-arrow">Δt → 0<br>⟶</span><div><span>瞬时净通量</span><code>jₜ(a) − jₜ(b)</code><b data-readout="rate">${signed(c.rate)}</b></div></div>
<p class="cnf-state" data-readout="state" aria-live="polite" aria-atomic="true">拖动小时间 Δt，观察差商如何趋近瞬时净通量。</p>
<div class="cnf-proof"><p><strong>除以 Δt 并取极限，回到正文的积分守恒式</strong></p>${math(String.raw`\frac{d}{dt}\int_a^b p_t(x)\,dx=j_t(a)-j_t(b)`)}<p>同样的关系对<strong>任意固定区间</strong>都成立，在足够光滑的条件下便得到局部方程：</p>${math(String.raw`\partial_t p_t(x)+\partial_x\!\bigl(p_t(x)u_t(x)\bigr)=0`)}</div>
<p class="cnf-note">数值例子：ψₜ(x₀) = (1+t)x₀ + 2t，X₀ ∼ N(0, 1)，uₜ(x) = (x+2)/(1+t)。真实区间质量 M(t) 按高斯密度积分计算。图中放大了两个边界附近，矩形宽度未作夸大；缩小 Δt 后会自然变窄。</p></div></div>${noScript}</figure>`;

const lossPlot = plots.loss;
const optimumX = px(Math.log(2), lossPlot);
const training = `<figure class="cnf-figure" data-cnf-demo="training" aria-labelledby="training-title">
<figcaption><span class="eyebrow">ANALYTIC EXAMPLE · 03</span><h3 id="training-title">调一个参数，训练一个可精确求解的 CNF</h3><p>uθ(x) = θx，X₀ ∼ N(0, 1)。目标 q = N(0, 2²)，模型标准差为 eᶿ。</p></figcaption>
<div class="cnf-training-panels">
<section class="cnf-training-panel" aria-labelledby="training-density-heading"><div class="cnf-training-panel-head"><h4 id="training-density-heading">模型分布与目标分布</h4>${legend([["reference", "目标 q · 标准差 2"], ["current", "模型 pθ · 标准差 eᶿ"]])}</div>
<svg class="cnf-chart" viewBox="0 0 520 260" role="img" aria-labelledby="training-density-title"><title id="training-density-title">一维 CNF 模型高斯密度与目标高斯密度的比较</title>${axes(plots.training, [-6, -4, -2, 0, 2, 4, 6], [0, 0.3, 0.6], "density")}${densityPaths(0, tr.sigma, plots.training, 0, 2)}</svg></section>
<section class="cnf-training-panel" aria-labelledby="training-loss-heading"><div class="cnf-training-panel-head"><h4 id="training-loss-heading">总体负对数似然 · 精确期望</h4>${legend([["current", "总体 NLL L(θ)"], ["reference", "最优 θ* = ln 2"]])}</div>
<svg class="cnf-chart cnf-loss-chart" viewBox="0 0 520 260" role="img" aria-labelledby="training-loss-title"><title id="training-loss-title">总体负对数似然随参数 theta 变化的曲线，最优参数为自然对数二</title>${axes(lossPlot, [-0.5, 0, 0.5, 1, 1.5], [2, 4, 6], "L(θ)")}<line class="cnf-optimum" x1="${optimumX}" x2="${optimumX}" y1="24" y2="${lossPlot.bottom}"/><path class="cnf-curve" d="${lossGeometry()}"/><line class="cnf-mean" data-part="loss-guide" x1="${px(0, lossPlot)}" x2="${px(0, lossPlot)}" y1="${py(tr.loss, lossPlot)}" y2="${lossPlot.bottom}"/><circle class="cnf-loss-point" data-part="loss-point" cx="${px(0, lossPlot)}" cy="${py(tr.loss, lossPlot)}" r="6"/><text class="cnf-optimum-label" x="${optimumX}" y="250" text-anchor="middle">最优 θ* = ln 2 ≈ 0.693</text></svg></section>
</div>
${slider("cnf-theta", "参数 θ", 0, -0.5, 1.5, 0.0001)}
<div class="cnf-actions"><button type="button" data-action="step" disabled>梯度更新一步</button><button type="button" class="cnf-reset" data-action="reset" disabled>重置 θ = 0</button><span>学习率 η = 0.05</span></div>
<dl class="cnf-metrics cnf-training-metrics">${metric("模型标准差 eᶿ", "sigma", f(tr.sigma))}${metric("总体 NLL", "loss", f(tr.loss))}${metric("梯度 ∂L/∂θ", "gradient", signed(tr.gradient))}</dl>
<p class="cnf-state" data-readout="state" aria-live="polite" aria-atomic="true">θ = 0.000，模型标准差 1.000，目标标准差 2。总体负对数似然 2.919，梯度 −3.000。</p><p class="cnf-note">每步执行 θ ← θ − 0.05·∂L/∂θ。L(θ) = ½ log(2π) + θ + 2e⁻²ᶿ；∂L/∂θ = 1 − 4e⁻²ᶿ。这是解析分布上的精确梯度示例，不涉及采样噪声，也不是实际神经网络训练。</p>${noScript}</figure>`;

export const cnfVisuals = { affine, continuity, training };
