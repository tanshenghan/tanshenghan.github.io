import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const runtime = ['../docs/blog/gaussian-demo.js', '../blog/gaussian-demo.js']
  .map((p) => path.resolve(dir, p)).find((p) => fs.existsSync(p));
if (!runtime) throw new Error('Missing blog/gaussian-demo.js');
const { gaussianState, geometry, plot, px, py } = createRequire(import.meta.url)(runtime);
const initial = geometry(0);
const current = geometry(0.25);
const state = gaussianState(0.25);
const yTicks = [0.1, 0.2, 0.3, 0.4];
const xTicks = [-8, -4, 0, 4, 8];

export const gaussianDemo = `<figure class="flow-demo gaussian-demo" aria-labelledby="gaussian-demo-title">
<figcaption><span class="eyebrow">INTERACTIVE NOTE 01</span><h3 id="gaussian-demo-title">把高斯分布拉宽，概率质量会怎样？</h3><p>左右拖动图形，或移动时间滑块：曲线变宽、峰值降低，总概率保持不变。</p></figcaption>
<div class="gaussian-legend"><span><i class="initial"></i>初始密度 p₀</span><span><i></i>当前密度 pₜ</span><span class="drag-hint">← 拖动探索 →</span></div>
<svg id="density-demo" viewBox="0 0 620 255" role="img" aria-labelledby="gaussian-svg-title" aria-describedby="gaussian-drag-help"><title id="gaussian-svg-title">高斯分布拉伸：标准差 1.25，峰值密度 0.319，总概率 1</title>
<g class="demo-grid">${yTicks.map((y) => `<path d="M${plot.left} ${py(y)}H${plot.right}"/>`).join('')}</g>
<path class="demo-axis" d="M${plot.left} ${plot.top}V${plot.bottom}H${plot.right + 7}"/>
<path id="density-area" class="density-area" d="${current.area}"/>
<path class="density-original" d="${initial.line}"/>
<path id="density-curve" d="${current.line}"/>
<circle id="flow-peak" cx="${px(0)}" cy="${py(state.peak)}" r="4"/>
<g id="flow-particles">${current.particles.map((p) => `<circle cx="${p.cx}" cy="${p.cy}" r="3.2"/>`).join('')}</g>
<g class="demo-labels">${yTicks.map((y) => `<text x="${plot.left - 8}" y="${py(y) + 4}" text-anchor="end">${y}</text>`).join('')}${xTicks.map((x) => `<text x="${px(x)}" y="242" text-anchor="middle">${x}</text>`).join('')}<text x="48" y="15">pₜ(x)</text><text x="590" y="223">x</text></g></svg>
<div class="demo-controls"><button id="flow-play" type="button" aria-label="播放高斯分布运输演示" aria-pressed="false" disabled>播放</button><label for="flow-time">时间 t</label><input id="flow-time" type="range" min="0" max="100" step="1" value="25" aria-describedby="gaussian-drag-help" disabled><output for="flow-time" id="flow-time-value">0.25</output></div>
<div class="demo-metrics"><span>标准差 σₜ <b id="flow-sigma">1.25</b></span><span>峰值密度 pₜ(0) <b id="flow-density">0.319</b></span><span>总概率质量 <b>1.00</b></span></div>
<p class="figure-note" id="gaussian-drag-help">ψₜ(x) = (1+t)x，X₀ ∼ N(0, 1)，Xₜ ∼ N(0, (1+t)²)。虚线为初始密度，蓝色为当前密度；底部圆点跟踪同一组初值，不重新采样。图中仅显示 [−8, 8]，高斯尾部延伸至无穷，总概率按整个实数轴计算。</p>
<noscript><p>当前展示 t = 0.25 的静态高斯密度。启用 JavaScript 后可拖动图形或滑块；滑块也支持键盘方向键。</p></noscript></figure>`;
