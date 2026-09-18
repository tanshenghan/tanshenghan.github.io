import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Share the exact analytic model with the browser, in either repository layout.
const dir = path.dirname(fileURLToPath(import.meta.url));
const runtime = ["../docs/blog/flow-visuals.js", "../blog/flow-visuals.js"].map((p) => path.resolve(dir, p)).find((p) => fs.existsSync(p));
if (!runtime) throw new Error("Missing blog/flow-visuals.js");
const require = createRequire(import.meta.url);
const { gaussian, affineState, continuityState, trainingState, plots, px, py, densityGeometry, lossGeometry } = require(runtime);
const f = (n, digits = 3) => n.toFixed(digits);
const signed = (n) => (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(3);

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
const c = continuityState(0.5);
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

const interval = densityGeometry(c.mean, c.sigma, plot, 0, 2);
const boundary = (x, label) => `<line class="cnf-boundary" x1="${px(x, plot)}" x2="${px(x, plot)}" y1="28" y2="197"/><path class="cnf-flux-arrow" d="M${px(x, plot) - 17} 54H${px(x, plot) + 17}m-6 -5 6 5-6 5"/><text class="cnf-boundary-label" x="${px(x, plot)}" y="242" text-anchor="middle">${label}</text>`;
const continuity = `<figure class="cnf-figure" data-cnf-demo="continuity" aria-labelledby="continuity-title">
<figcaption><span class="eyebrow">ANALYTIC EXAMPLE · 02</span><h3 id="continuity-title">固定区间里的概率，从边界流入与流出</h3><p>仍用上面的高斯 Flow，只统计固定区间 [0, 2] 内的概率质量 M(t)。</p></figcaption>
${legend([["current", "当前密度 pₜ"], ["fill", "区间概率 M(t)"], ["boundary", "固定边界 0 与 2"]])}
<svg class="cnf-chart" viewBox="0 0 520 260" role="img" aria-labelledby="continuity-svg-title"><title id="continuity-svg-title">固定区间零到二的高斯密度积分，左右边界通量之差决定概率质量的变化率</title>${axes(plot, [-4, -2, 0, 2, 4, 6, 8], [0, 0.2, 0.4])}<path class="cnf-interval" data-part="interval-area" d="${interval.area}"/><path class="cnf-curve" data-part="density" d="${densityGeometry(c.mean, c.sigma).line}"/>${boundary(0, "a = 0")}${boundary(2, "b = 2")}</svg>
${slider("cnf-continuity-time", "时间 t", c.t)}
<div class="cnf-balance"><span>流入 j(0)<b data-readout="left-flux">${signed(c.leftFlux)}</b></span><i aria-hidden="true">−</i><span>流出 j(2)<b data-readout="right-flux">${signed(c.rightFlux)}</b></span><i aria-hidden="true">=</i><span>变化率 dM/dt<b data-readout="rate">${signed(c.rate)}</b></span></div>
<p class="cnf-mass">区间概率 M(t) = <strong data-readout="mass">${f(c.mass)}</strong></p><p class="cnf-state" data-readout="state" aria-live="polite" aria-atomic="true">区间概率为 ${f(c.mass)}，当前流出大于流入，概率正在减少。变化率为 ${signed(c.rate)}。</p><p class="cnf-note">jₜ(x) = pₜ(x)uₜ(x) 是带符号的概率通量，正号表示向右。这个例子在两个边界的通量均为正：左侧流入，右侧流出。箭头只表示方向，不表示大小；这里比较的是通量差，不是速度场的散度。</p>${noScript}</figure>`;

const lossPlot = plots.loss;
const optimumX = px(Math.log(2), lossPlot);
const training = `<figure class="cnf-figure" data-cnf-demo="training" aria-labelledby="training-title">
<figcaption><span class="eyebrow">ANALYTIC EXAMPLE · 03</span><h3 id="training-title">调一个参数，训练一个可精确求解的 CNF</h3><p>uθ(x) = θx，X₀ ∼ N(0, 1)。目标 q = N(0, 2²)，模型标准差为 eᶿ。</p></figcaption>
${legend([["reference", "目标 q · 标准差 2"], ["current", "模型 pθ · 标准差 eᶿ"]])}
<svg class="cnf-chart" viewBox="0 0 520 233" role="img" aria-labelledby="training-density-title"><title id="training-density-title">一维 CNF 模型高斯密度与目标高斯密度的比较</title>${axes(plots.training, [-6, -4, -2, 0, 2, 4, 6], [0, 0.3, 0.6], "density")}${densityPaths(0, tr.sigma, plots.training, 0, 2)}</svg>
${slider("cnf-theta", "参数 θ", 0, -0.5, 1.5, 0.0001)}
<div class="cnf-actions"><button type="button" data-action="step" disabled>梯度更新一步</button><button type="button" class="cnf-reset" data-action="reset" disabled>重置 θ = 0</button><span>学习率 η = 0.05</span></div>
<p class="cnf-chart-heading">总体负对数似然 · 精确期望</p>
<svg class="cnf-chart cnf-loss-chart" viewBox="0 0 520 204" role="img" aria-labelledby="training-loss-title"><title id="training-loss-title">总体负对数似然随参数 theta 变化的曲线，最优参数为自然对数二</title>${axes(lossPlot, [-0.5, 0, 0.5, 1, 1.5], [2, 4, 6], "L(θ)")}<line class="cnf-optimum" x1="${optimumX}" x2="${optimumX}" y1="24" y2="155"/><path class="cnf-curve" d="${lossGeometry()}"/><line class="cnf-mean" data-part="loss-guide" x1="${px(0, lossPlot)}" x2="${px(0, lossPlot)}" y1="${py(tr.loss, lossPlot)}" y2="155"/><circle class="cnf-loss-point" data-part="loss-point" cx="${px(0, lossPlot)}" cy="${py(tr.loss, lossPlot)}" r="6"/><text class="cnf-optimum-label" x="${optimumX}" y="197" text-anchor="middle">最优 θ* = ln 2 ≈ 0.693</text></svg>
<dl class="cnf-metrics cnf-training-metrics">${metric("模型标准差 eᶿ", "sigma", f(tr.sigma))}${metric("总体 NLL", "loss", f(tr.loss))}${metric("梯度 ∂L/∂θ", "gradient", signed(tr.gradient))}</dl>
<p class="cnf-state" data-readout="state" aria-live="polite" aria-atomic="true">θ = 0.000，模型标准差 1.000，目标标准差 2。总体负对数似然 2.919，梯度 −3.000。</p><p class="cnf-note">每步执行 θ ← θ − 0.05·∂L/∂θ。L(θ) = ½ log(2π) + θ + 2e⁻²ᶿ；∂L/∂θ = 1 − 4e⁻²ᶿ。这是解析分布上的精确梯度示例，不涉及采样噪声，也不是实际神经网络训练。</p>${noScript}</figure>`;

export const cnfVisuals = { affine, continuity, training };
