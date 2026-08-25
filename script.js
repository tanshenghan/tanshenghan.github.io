(() => {
  const root = document.documentElement;
  const themeButton = document.querySelector(".theme-toggle");
  const languageButton = document.querySelector(".language-toggle");
  const menuButton = document.querySelector(".menu-toggle");
  const mobileNav = document.querySelector(".mobile-nav");

  document.querySelector("#year").textContent = new Date().getFullYear();
  const storedTheme = localStorage.getItem("shenghan-theme");
  if (storedTheme) root.dataset.theme = storedTheme;

  const menuLabel = (open = false) => {
    const zh = root.dataset.lang === "zh";
    return open ? (zh ? "关闭" : "Close") : (zh ? "菜单" : "Menu");
  };

  const setLanguage = (language) => {
    root.dataset.lang = language;
    root.lang = language === "zh" ? "zh-CN" : "en";
    languageButton.textContent = language === "zh" ? "EN" : "中";
    languageButton.setAttribute("aria-label", language === "zh" ? "Switch to English" : "切换为中文");
    document.title = language === "zh" ? "谭圣涵 · 北京航空航天大学" : "Shenghan Tan · Beihang University";
    menuButton.textContent = menuLabel(menuButton.getAttribute("aria-expanded") === "true");
    localStorage.setItem("shenghan-language", language);
  };

  setLanguage(localStorage.getItem("shenghan-language") === "zh" ? "zh" : "en");
  languageButton.addEventListener("click", () => setLanguage(root.dataset.lang === "zh" ? "en" : "zh"));

  themeButton.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    localStorage.setItem("shenghan-theme", next);
  });

  const closeMenu = () => {
    mobileNav.hidden = true;
    menuButton.textContent = menuLabel(false);
    menuButton.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
  };

  menuButton.addEventListener("click", () => {
    const opening = mobileNav.hidden;
    mobileNav.hidden = !opening;
    menuButton.textContent = menuLabel(opening);
    menuButton.setAttribute("aria-expanded", String(opening));
    document.body.classList.toggle("menu-open", opening);
  });
  mobileNav.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

  const observer = new IntersectionObserver(
    (entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }),
    { threshold: 0.1 },
  );
  document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));

  const canvas = document.querySelector("#globe-canvas");
  const context = canvas.getContext("2d");
  const beijing = geoPoint(39.9042, 116.4074);
  const destinations = [
    geoPoint(37.7749, -122.4194),
    geoPoint(51.5072, -0.1276),
    geoPoint(35.6762, 139.6503),
  ];
  let countryArcs = [];

  fetch("./assets/countries-110m.json")
    .then((response) => response.json())
    .then((topology) => {
      const scale = topology.transform.scale;
      const translate = topology.transform.translate;
      countryArcs = topology.arcs.map((arcData) => {
        let x = 0;
        let y = 0;
        return arcData.map(([dx, dy]) => {
          x += dx;
          y += dy;
          const longitude = x * scale[0] + translate[0];
          const latitude = y * scale[1] + translate[1];
          return geoPoint(latitude, longitude);
        });
      });
    })
    .catch(() => {});

  let width = 0;
  let height = 0;
  let ratio = 1;
  let rotationX = -0.22;
  let rotationY = -1.45;
  let targetX = rotationX;
  let targetY = rotationY;
  let dragging = false;
  let previous = { x: 0, y: 0 };
  let lastFrame = performance.now();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function geoPoint(lat, lon) {
    const phi = ((90 - lat) * Math.PI) / 180;
    const theta = ((lon + 180) * Math.PI) / 180;
    return {
      x: -Math.sin(phi) * Math.cos(theta),
      y: Math.cos(phi),
      z: Math.sin(phi) * Math.sin(theta),
    };
  }

  function rotate(point) {
    const cy = Math.cos(rotationY);
    const sy = Math.sin(rotationY);
    const x = point.x * cy - point.z * sy;
    const z = point.x * sy + point.z * cy;
    const cx = Math.cos(rotationX);
    const sx = Math.sin(rotationX);
    return { x, y: point.y * cx - z * sx, z: point.y * sx + z * cx };
  }

  function arc(from, to, steps = 34) {
    return Array.from({ length: steps }, (_, index) => {
      const t = index / (steps - 1);
      const raw = {
        x: from.x * (1 - t) + to.x * t,
        y: from.y * (1 - t) + to.y * t,
        z: from.z * (1 - t) + to.z * t,
      };
      const length = Math.hypot(raw.x, raw.y, raw.z);
      const lift = 1 + Math.sin(Math.PI * t) * 0.1;
      return { x: raw.x / length * lift, y: raw.y / length * lift, z: raw.z / length * lift };
    });
  }

  const graticules = [
    ...[-60, -30, 0, 30, 60].map((latitude) =>
      Array.from({ length: 73 }, (_, index) => geoPoint(latitude, -180 + index * 5))),
    ...[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((longitude) =>
      Array.from({ length: 37 }, (_, index) => geoPoint(-90 + index * 5, longitude))),
  ];

  function strokeVisiblePath(path, radius) {
    let drawing = false;
    context.beginPath();
    path.forEach((rawPoint) => {
      const point = rotate(rawPoint);
      if (point.z < 0) {
        drawing = false;
        return;
      }
      const x = point.x * radius;
      const y = -point.y * radius;
      if (!drawing) context.moveTo(x, y);
      else context.lineTo(x, y);
      drawing = true;
    });
    context.stroke();
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    ratio = Math.min(devicePixelRatio || 1, 2);
    width = bounds.width;
    height = bounds.height;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function color(name) {
    return getComputedStyle(root).getPropertyValue(name).trim();
  }

  function draw(now) {
    const delta = Math.min((now - lastFrame) / 16.7, 2);
    lastFrame = now;
    if (!dragging && !reducedMotion) targetY += 0.0013 * delta;
    rotationX += (targetX - rotationX) * 0.09;
    rotationY += (targetY - rotationY) * 0.09;

    context.clearRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.39;
    const ink = color("--globe");
    const accent = color("--accent");

    context.save();
    context.translate(cx, cy);

    context.globalAlpha = 0.035;
    context.fillStyle = accent;
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.fill();

    context.globalAlpha = 0.28;
    context.strokeStyle = ink;
    context.lineWidth = 1.1;
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.stroke();

    context.globalAlpha = 0.14;
    context.strokeStyle = ink;
    context.lineWidth = 0.55;
    graticules.forEach((line) => strokeVisiblePath(line, radius));

    context.globalAlpha = 0.76;
    context.strokeStyle = accent;
    context.lineWidth = 0.82;
    countryArcs.forEach((countryArc) => strokeVisiblePath(countryArc, radius));

    context.globalAlpha = 0.68;
    context.strokeStyle = accent;
    context.setLineDash([3, 5]);
    destinations.forEach((destination) => {
      let drawing = false;
      context.beginPath();
      arc(beijing, destination).forEach((raw) => {
        const point = rotate(raw);
        if (point.z < 0) { drawing = false; return; }
        if (!drawing) context.moveTo(point.x * radius, -point.y * radius);
        else context.lineTo(point.x * radius, -point.y * radius);
        drawing = true;
      });
      context.stroke();
    });
    context.setLineDash([]);

    const node = rotate(beijing);
    if (node.z > 0) {
      context.globalAlpha = 1;
      context.fillStyle = accent;
      context.beginPath();
      context.arc(node.x * radius, -node.y * radius, 3.5, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
    context.globalAlpha = 1;
    requestAnimationFrame(draw);
  }

  canvas.addEventListener("pointerdown", (event) => {
    dragging = true;
    previous = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    targetY += (event.clientX - previous.x) * 0.008;
    targetX = Math.max(-1.1, Math.min(1.1, targetX - (event.clientY - previous.y) * 0.007));
    previous = { x: event.clientX, y: event.clientY };
  });
  ["pointerup", "pointercancel"].forEach((eventName) => canvas.addEventListener(eventName, () => { dragging = false; }));
  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(draw);
})();
