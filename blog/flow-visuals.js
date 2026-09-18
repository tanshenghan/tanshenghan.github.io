/* Analytic examples: no sampling, model service, or external runtime is needed. */
(function () {
  "use strict";

  const gaussian = (x, mean = 0, sigma = 1) => Math.exp(-0.5 * ((x - mean) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI));
  function normalCdf(x) {
    // Integrate the Gaussian power series near the origin (the demo uses |x| ≤ 2).
    if (Math.abs(x) <= 3) {
      let term = x;
      let sum = term;
      for (let n = 1; n < 100; n += 1) {
        term *= -x * x / (2 * n);
        const addition = term / (2 * n + 1);
        sum += addition;
        if (Math.abs(addition) < 1e-16) break;
      }
      return 0.5 + sum / Math.sqrt(2 * Math.PI);
    }
    // Tail fallback: Abramowitz–Stegun 7.1.26; absolute error below 1.5e-7.
    const z = Math.abs(x) / Math.sqrt(2);
    const t = 1 / (1 + 0.3275911 * z);
    const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z);
    return 0.5 * (1 + (x < 0 ? -erf : erf));
  }
  const affineState = (t) => ({ t, mean: 2 * t, sigma: 1 + t, particle: 1 + 3 * t, velocity: 3 });
  function continuityState(t) {
    const state = affineState(t);
    const leftFlux = gaussian(0, state.mean, state.sigma) * 2 / (1 + t);
    const rightFlux = gaussian(2, state.mean, state.sigma) * 4 / (1 + t);
    return { ...state, leftFlux, rightFlux, rate: leftFlux - rightFlux, mass: normalCdf((2 - state.mean) / state.sigma) - normalCdf(-state.mean / state.sigma) };
  }
  function trainingState(theta) {
    return { theta, sigma: Math.exp(theta), loss: 0.5 * Math.log(2 * Math.PI) + theta + 2 * Math.exp(-2 * theta), gradient: 1 - 4 * Math.exp(-2 * theta) };
  }
  const plots = {
    transport: { left: 45, right: 495, top: 24, bottom: 197, xmin: -4, xmax: 8, ymax: 0.45 },
    training: { left: 45, right: 495, top: 24, bottom: 197, xmin: -6, xmax: 6, ymax: 0.72 },
    loss: { left: 45, right: 495, top: 24, bottom: 155, xmin: -0.5, xmax: 1.5, ymin: 1.8, ymax: 6.1 }
  };
  const px = (x, plot) => plot.left + (x - plot.xmin) / (plot.xmax - plot.xmin) * (plot.right - plot.left);
  const py = (y, plot) => plot.bottom - (y - (plot.ymin || 0)) / (plot.ymax - (plot.ymin || 0)) * (plot.bottom - plot.top);
  function curve(fn, plot, from = plot.xmin, to = plot.xmax, count = 180) {
    return Array.from({ length: count + 1 }, (_, i) => {
      const x = from + i / count * (to - from);
      return (i ? "L" : "M") + px(x, plot).toFixed(2) + " " + py(fn(x), plot).toFixed(2);
    }).join(" ");
  }
  function densityGeometry(mean, sigma, plot = plots.transport, from = plot.xmin, to = plot.xmax) {
    const line = curve((x) => gaussian(x, mean, sigma), plot, from, to);
    return { line, area: line + " L" + px(to, plot).toFixed(2) + " " + plot.bottom + " L" + px(from, plot).toFixed(2) + " " + plot.bottom + " Z" };
  }
  const lossGeometry = () => curve((theta) => trainingState(theta).loss, plots.loss);
  const model = { gaussian, normalCdf, affineState, continuityState, trainingState, plots, px, py, curve, densityGeometry, lossGeometry };
  if (typeof module !== "undefined" && module.exports) module.exports = model;
  if (typeof document === "undefined") return;

  const fixed = (n, digits = 3) => n.toFixed(digits);
  const signed = (n) => (n >= 0 ? "+" : "−") + Math.abs(n).toFixed(3);
  function setText(root, key, value) {
    const el = root.querySelector('[data-readout="' + key + '"]');
    if (el) el.textContent = value;
  }
  function setAttr(root, key, attribute, value) {
    const el = root.querySelector('[data-part="' + key + '"]');
    if (el) el.setAttribute(attribute, String(value));
  }
  function updateDensity(root, mean, sigma, plot = plots.transport) {
    const density = densityGeometry(mean, sigma, plot);
    setAttr(root, "density", "d", density.line);
    setAttr(root, "density-area", "d", density.area);
  }
  function updateAffine(root, t) {
    const state = affineState(t);
    const plot = plots.transport;
    updateDensity(root, state.mean, state.sigma);
    const particleX = px(state.particle, plot);
    const meanX = px(state.mean, plot);
    setAttr(root, "mean", "x1", meanX);
    setAttr(root, "mean", "x2", meanX);
    setAttr(root, "particle", "cx", particleX);
    setAttr(root, "particle-trail", "x2", particleX);
    setText(root, "time", fixed(t, 2));
    setText(root, "mean", fixed(state.mean, 2));
    setText(root, "sigma", fixed(state.sigma, 2));
    setText(root, "particle", fixed(state.particle, 2));
    setText(root, "state", "t = " + fixed(t, 2) + "：均值 " + fixed(state.mean, 2) + "，标准差 " + fixed(state.sigma, 2) + "；初值为 1 的粒子到达 " + fixed(state.particle, 2) + "，沿途速度始终为 3。");
    root.querySelector('input').setAttribute("aria-valuetext", "时间 " + fixed(t, 2));
  }
  function updateContinuity(root, t) {
    const state = continuityState(t);
    updateDensity(root, state.mean, state.sigma);
    setAttr(root, "interval-area", "d", densityGeometry(state.mean, state.sigma, plots.transport, 0, 2).area);
    setText(root, "time", fixed(t, 2));
    setText(root, "left-flux", signed(state.leftFlux));
    setText(root, "right-flux", signed(state.rightFlux));
    setText(root, "mass", fixed(state.mass));
    setText(root, "rate", signed(state.rate));
    setText(root, "state", "区间概率为 " + fixed(state.mass) + "，当前" + (state.rate >= 0 ? "流入大于流出，概率正在增加" : "流出大于流入，概率正在减少") + "。变化率为 " + signed(state.rate) + "。");
    root.querySelector('input').setAttribute("aria-valuetext", "时间 " + fixed(t, 2));
  }
  function updateTraining(root, theta) {
    const state = trainingState(theta);
    updateDensity(root, 0, state.sigma, plots.training);
    const x = px(theta, plots.loss);
    const y = py(state.loss, plots.loss);
    setAttr(root, "loss-point", "cx", x);
    setAttr(root, "loss-point", "cy", y);
    setAttr(root, "loss-guide", "x1", x);
    setAttr(root, "loss-guide", "x2", x);
    setAttr(root, "loss-guide", "y1", y);
    setText(root, "theta", fixed(theta));
    setText(root, "sigma", fixed(state.sigma));
    setText(root, "loss", fixed(state.loss));
    setText(root, "gradient", signed(state.gradient));
    setText(root, "state", "θ = " + fixed(theta) + "，模型标准差 " + fixed(state.sigma) + "，目标标准差 2。总体负对数似然 " + fixed(state.loss) + "，梯度 " + signed(state.gradient) + "。");
    root.querySelector('input').setAttribute("aria-valuetext", "参数 theta " + fixed(theta));
  }

  document.querySelectorAll("[data-cnf-demo]").forEach((root) => {
    const slider = root.querySelector("input[type=range]");
    const kind = root.dataset.cnfDemo;
    const update = kind === "affine" ? updateAffine : kind === "continuity" ? updateContinuity : updateTraining;
    const render = () => update(root, Number(slider.value));
    slider.disabled = false;
    slider.addEventListener("input", render);
    root.querySelectorAll("button").forEach((button) => {
      button.disabled = false;
      button.addEventListener("click", () => {
        const theta = Number(slider.value);
        slider.value = button.dataset.action === "reset" ? "0" : String(Math.max(-0.5, Math.min(1.5, theta - 0.05 * trainingState(theta).gradient)));
        render();
      });
    });
    render();
  });
})();
