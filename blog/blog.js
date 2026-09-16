(() => {
  const root = document.documentElement;
  const themeButton = document.querySelector(".blog-theme");
  const readPreference = () => {
    try { return localStorage.getItem("shenghan-theme"); } catch { return null; }
  };
  const setTheme = (theme) => {
    root.dataset.theme = theme;
    themeButton.setAttribute("aria-pressed", String(theme === "dark"));
    themeButton.setAttribute("aria-label", theme === "dark" ? "切换为浅色主题" : "切换为深色主题");
    try { localStorage.setItem("shenghan-theme", theme); } catch { /* Reading works without storage. */ }
  };
  setTheme(readPreference() || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  themeButton.addEventListener("click", () => setTheme(root.dataset.theme === "dark" ? "light" : "dark"));

  const headings = [...document.querySelectorAll(".prose h2[id]")];
  const links = [...document.querySelectorAll('.toc-desktop a[href^="#"], .toc-mobile a[href^="#"]')];
  const progress = document.querySelector(".reading-progress span");
  let ticking = false;
  function updateReading() {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = "scaleX(" + (max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0) + ")";
    let active = headings[0]?.id;
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= 150) active = heading.id;
    }
    links.forEach((link) => {
      if (link.hash === "#" + active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
    ticking = false;
  }
  addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(updateReading); }
  }, { passive: true });
  addEventListener("resize", updateReading);
  addEventListener("load", updateReading);
  updateReading();
  document.querySelectorAll(".toc-mobile a").forEach((link) => link.addEventListener("click", () => {
    document.querySelector(".toc-mobile").open = false;
  }));

  const slider = document.querySelector("#flow-time");
  if (!slider) return;
  const svgNS = "http://www.w3.org/2000/svg";
  const particles = document.querySelector("#flow-particles");
  const dots = Array.from({ length: 9 }, () => {
    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("r", "3.2");
    particles.append(circle);
    return circle;
  });
  const play = document.querySelector("#flow-play");
  const area = document.querySelector("#density-area");
  let playing = false;
  let frame = 0;
  let start = 0;
  function render() {
    const t = Number(slider.value) / 100;
    const length = 1 + t;
    const density = 1 / length;
    area.setAttribute("width", String(250 * length));
    area.setAttribute("height", String(160 * density));
    area.setAttribute("y", String(220 - 160 * density));
    dots.forEach((dot, index) => {
      dot.setAttribute("cx", String(45 + 250 * length * (index + 0.5) / 9));
      dot.setAttribute("cy", "209");
    });
    document.querySelector("#flow-time-value").value = t.toFixed(2);
    document.querySelector("#flow-length").textContent = length.toFixed(2);
    document.querySelector("#flow-density").textContent = density.toFixed(2);
    slider.setAttribute("aria-valuetext", "时间 " + t.toFixed(2) + "，区间长度 " + length.toFixed(2) + "，密度 " + density.toFixed(2) + "，概率质量 1");
  }
  function stop() {
    playing = false;
    cancelAnimationFrame(frame);
    play.textContent = "播放";
    play.setAttribute("aria-label", "播放概率运输演示");
    play.setAttribute("aria-pressed", "false");
  }
  function animate(now) {
    if (!playing) return;
    const value = Math.min(100, (now - start) / 60);
    slider.value = String(Math.round(value));
    render();
    if (value >= 100) stop();
    else frame = requestAnimationFrame(animate);
  }
  play.addEventListener("click", () => {
    if (playing) return stop();
    if (Number(slider.value) === 100) slider.value = "0";
    playing = true;
    start = performance.now() - Number(slider.value) * 60;
    play.textContent = "暂停";
    play.setAttribute("aria-label", "暂停概率运输演示");
    play.setAttribute("aria-pressed", "true");
    frame = requestAnimationFrame(animate);
  });
  slider.addEventListener("input", () => { stop(); render(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });
  new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) stop(); }).observe(slider);
  render();
})();
