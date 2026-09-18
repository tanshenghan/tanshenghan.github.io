(() => {
  // The build and the browser use the same analytic model and fixed particles.
  const plot = { left: 48, right: 574, top: 24, bottom: 220, xmin: -8, xmax: 8, ymax: 0.44 };
  const sampleOrigins = [-1.59, -0.97, -0.59, -0.28, 0, 0.28, 0.59, 0.97, 1.59];
  const density = (x, sigma) => Math.exp(-0.5 * (x / sigma) ** 2) / (Math.sqrt(2 * Math.PI) * sigma);
  const px = (x) => plot.left + (x - plot.xmin) / (plot.xmax - plot.xmin) * (plot.right - plot.left);
  const py = (y) => plot.bottom - y / plot.ymax * (plot.bottom - plot.top);
  const gaussianState = (t) => ({ t, sigma: 1 + t, peak: density(0, 1 + t), mass: 1 });
  function geometry(t) {
    const { sigma } = gaussianState(t);
    const points = Array.from({ length: 321 }, (_, i) => {
      const x = plot.xmin + (plot.xmax - plot.xmin) * i / 320;
      return `${px(x).toFixed(2)},${py(density(x, sigma)).toFixed(2)}`;
    });
    const line = 'M' + points.join('L');
    return { line, area: `${line}L${plot.right},${plot.bottom}L${plot.left},${plot.bottom}Z`,
      particles: sampleOrigins.map((origin) => ({ x: origin * sigma, cx: px(origin * sigma), cy: 211 })) };
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { gaussianState, geometry, density, plot, sampleOrigins, px, py };
  }
  if (typeof document === 'undefined') return;
  const figure = document.querySelector('.gaussian-demo');
  if (!figure) return;
  const find = (selector) => figure.querySelector(selector);
  const chart = find('#density-demo');
  const slider = find('#flow-time');
  const play = find('#flow-play');
  const particles = [...figure.querySelectorAll('#flow-particles circle')];
  let frame = 0;
  let playing = false;
  let start = 0;
  let drag = null;
  function render() {
    const t = Number(slider.value) / 100;
    const state = gaussianState(t);
    const paths = geometry(t);
    find('#density-area').setAttribute('d', paths.area);
    find('#density-curve').setAttribute('d', paths.line);
    find('#flow-peak').setAttribute('cy', py(state.peak));
    particles.forEach((dot, i) => dot.setAttribute('cx', paths.particles[i].cx));
    find('#flow-time-value').value = t.toFixed(2);
    find('#flow-sigma').textContent = state.sigma.toFixed(2);
    find('#flow-density').textContent = state.peak.toFixed(3);
    const description = `时间 ${t.toFixed(2)}，标准差 ${state.sigma.toFixed(2)}，峰值密度 ${state.peak.toFixed(3)}，总概率 1`;
    slider.setAttribute('aria-valuetext', description);
    find('#gaussian-svg-title').textContent = description;
  }
  function stop() {
    playing = false;
    cancelAnimationFrame(frame);
    play.textContent = '播放';
    play.setAttribute('aria-label', '播放高斯分布运输演示');
    play.setAttribute('aria-pressed', 'false');
  }
  function animate(now) {
    if (!playing) return;
    const value = Math.min(100, (now - start) / 60);
    slider.value = String(Math.round(value));
    render();
    if (value >= 100) stop();
    else frame = requestAnimationFrame(animate);
  }
  play.addEventListener('click', () => {
    if (playing) return stop();
    if (Number(slider.value) >= 100) slider.value = '0';
    playing = true;
    start = performance.now() - Number(slider.value) * 60;
    play.textContent = '暂停';
    play.setAttribute('aria-label', '暂停高斯分布运输演示');
    play.setAttribute('aria-pressed', 'true');
    frame = requestAnimationFrame(animate);
  });
  slider.addEventListener('input', () => { stop(); render(); });
  chart.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    stop();
    drag = { id: event.pointerId, x: event.clientX, time: Number(slider.value), width: chart.getBoundingClientRect().width };
    chart.setPointerCapture(event.pointerId);
    chart.classList.add('is-dragging');
  });
  chart.addEventListener('pointermove', (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    slider.value = String(Math.round(Math.max(0, Math.min(100, drag.time + (event.clientX - drag.x) / drag.width * 200))));
    render();
  });
  function endDrag(event) {
    if (!drag || drag.id !== event.pointerId) return;
    drag = null;
    chart.classList.remove('is-dragging');
    if (chart.hasPointerCapture(event.pointerId)) chart.releasePointerCapture(event.pointerId);
  }
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((name) => chart.addEventListener(name, endDrag));
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) stop(); }).observe(figure);
  slider.disabled = false;
  play.disabled = false;
  render();
})();
