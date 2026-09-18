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

})();
