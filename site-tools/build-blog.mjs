import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import katex from "katex";

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
// Support both the local docs/ workspace and the root-based GitHub Pages repo.
const siteDir = process.env.SITE_OUTPUT_DIR
  ? path.resolve(process.env.SITE_OUTPUT_DIR)
  : path.resolve(toolsDir, fs.existsSync(path.resolve(toolsDir, "../docs/index.html")) ? "../docs" : "..");
const outputDir = path.join(siteDir, "blog");
const posts = JSON.parse(fs.readFileSync(path.join(toolsDir, "posts.json"), "utf8"));
const version = "20260916-flow-1";
const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const formula = (tex, displayMode = false) => katex.renderToString(tex, { displayMode, throwOnError: true, output: "htmlAndMathml", strict: "error" });
const articlePath = (post) => post.seriesSlug + "/" + post.slug + "/";
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(path.join(outputDir, "vendor/katex"), { recursive: true });
fs.copyFileSync(path.join(toolsDir, "node_modules/katex/dist/katex.min.css"), path.join(outputDir, "vendor/katex/katex.min.css"));
fs.copyFileSync(path.join(toolsDir, "node_modules/katex/LICENSE"), path.join(outputDir, "vendor/katex/LICENSE"));
fs.cpSync(path.join(toolsDir, "node_modules/katex/dist/fonts"), path.join(outputDir, "vendor/katex/fonts"), { recursive: true });

function flowArt() {
  const curves = Array.from({ length: 11 }, (_, i) => {
    const y = 42 + i * 12;
    const mid = 105 + (y - 102) * 0.44;
    const end = 100 + (y - 102) * 1.42;
    return '<path d="M30 ' + y + " C150 " + y + " 165 " + mid + " 275 " + mid + " S395 " + end + " 510 " + end + '" />';
  }).join("");
  return '<svg class="flow-art" viewBox="0 0 540 230" role="img" aria-label="由不同起点出发，沿同一 flow 连续运输的轨迹示意图"><g class="flow-lines">' + curves + '</g><g class="flow-labels"><text x="30" y="216">INITIAL STATE</text><text x="226" y="216">CONTINUOUS FLOW</text><text x="463" y="216">STATE t</text></g></svg>';
}

function header(home, blog, isArticle) {
  return '<a class="skip" href="#main">跳至正文</a><header class="blog-header"><div class="header-inner"><a class="blog-brand" href="' + home + '"><span class="seal" aria-hidden="true"></span><span>谭圣涵<small>SHENGHAN TAN</small></span></a><nav aria-label="站点导航"><a href="' + home + '">主页</a><a class="nav-current" href="' + blog + '" aria-current="' + (isArticle ? "false" : "page") + '">BLOG</a><button class="blog-theme" type="button" aria-label="切换深浅色主题" aria-pressed="false"><span aria-hidden="true">◐</span></button></nav></div></header><div class="reading-progress" aria-hidden="true"><span></span></div>';
}

function shell({ title, description, relative, body, canonical, article = false }) {
  return '<!doctype html>\n<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="' + escape(description) + '"><meta name="theme-color" content="#f8f9fb"><meta property="og:type" content="' + (article ? "article" : "website") + '"><meta property="og:title" content="' + escape(title) + '"><meta property="og:description" content="' + escape(description) + '"><link rel="canonical" href="https://tanshenghan.github.io/blog/' + canonical + '"><title>' + escape(title) + ' · 谭圣涵</title><link rel="stylesheet" href="' + relative + 'vendor/katex/katex.min.css"><link rel="stylesheet" href="' + relative + 'blog.css?v=' + version + '"><script src="' + relative + 'blog.js?v=' + version + '" defer></script></head><body>' +
    header(relative + "../", relative || "./", article) + body +
    '<footer class="blog-footer"><span>© 2026 谭圣涵 · Shenghan Tan</span><a href="' + (relative || "./") + '">技术博客</a><a href="#top">回到顶部 ↑</a></footer></body></html>\n';
}

function teaser(post, prefix) {
  return '<a class="post-row" href="' + prefix + articlePath(post) + '"><span class="post-number">' + post.number + '</span><div><div class="post-meta">' + post.date.replaceAll("-", ".") + ' <span>·</span> ' + post.minutes + ' 分钟阅读</div><h3>' + escape(post.title) + '</h3><p>' + escape(post.description) + '</p><span class="post-tags">' + post.tags.map(escape).join(" / ") + '</span></div><span class="post-arrow" aria-hidden="true">↗</span></a>';
}

const series = [...new Set(posts.map((p) => p.seriesSlug))];
const indexBody = '<main id="main" class="index-shell"><div id="top"></div><section class="index-hero"><div><p class="eyebrow">NOTES ON LEARNING & BUILDING</p><h1>BLOG<span class="blue-dot">.</span></h1><p class="index-intro">把理解写下来，<br>让问题继续向前。</p><p class="index-description">关于生成模型、具身智能与研究实践的技术笔记。</p></div><div class="index-art">' + flowArt() + '<span>IDEAS IN MOTION</span></div></section><section class="index-series"><div class="listing-heading"><h2>按系列阅读</h2><span>' + series.length + ' 个系列 / ' + posts.length + ' 篇笔记</span></div>' + series.map((slug) => {
  const list = posts.filter((p) => p.seriesSlug === slug);
  return '<div class="series-line"><div><span class="eyebrow">SERIES ' + String(series.indexOf(slug) + 1).padStart(2, "0") + '</span><h2><a href="' + slug + '/">' + escape(list[0].series) + ' <span aria-hidden="true">↗</span></a></h2><p>从概率运输与连续动力学出发，逐步理解 Flow Matching。</p></div><span class="series-count">' + list.length + ' 篇</span></div>' + list.map((p) => teaser(p, "")).join("");
}).join("") + '</section></main>';
fs.writeFileSync(path.join(outputDir, "index.html"), shell({ title: "BLOG · 技术博客", description: "谭圣涵的技术博客：生成模型、具身智能与研究实践。", relative: "", body: indexBody, canonical: "" }));

for (const slug of series) {
  const list = posts.filter((p) => p.seriesSlug === slug);
  const dir = path.join(outputDir, slug);
  fs.mkdirSync(dir, { recursive: true });
  const body = '<main id="main" class="index-shell"><div id="top"></div><nav class="breadcrumbs" aria-label="面包屑"><a href="../">BLOG</a><span>/</span><span>' + escape(list[0].series) + '</span></nav><section class="series-hero"><p class="eyebrow">A LEARNING JOURNEY · ' + list.length + ' NOTE</p><h1>' + escape(list[0].series) + '</h1><p>从随机变量出发，走向连续的概率运输。</p>' + flowArt() + '</section><section aria-label="系列文章"><div class="listing-heading"><h2>阅读目录</h2><span>按篇章展开</span></div>' + list.map((p) => teaser(p, "../")).join("") + '</section></main>';
  fs.writeFileSync(path.join(dir, "index.html"), shell({ title: list[0].series, description: "从概率运输与 ODE flow 开始的 Flow Matching 学习笔记。", relative: "../", body, canonical: slug + "/" }));
}

const demo = '<figure class="flow-demo"><figcaption><span class="eyebrow">INTERACTIVE NOTE 01</span><h3>把空间拉长，概率质量会怎样？</h3><p>拖动时间滑块，观察同一组粒子与密度一起变化。</p></figcaption><svg id="density-demo" viewBox="0 0 620 250" role="img" aria-label="均匀分布在拉伸映射下的密度变化"><title>映射 ψₜ(x) = (1+t)x：区间变宽，密度降低，面积保持为 1</title><g class="demo-grid"><path d="M45 40H575 M45 100H575 M45 160H575 M45 220H575" /></g><path class="demo-axis" d="M45 25V220H585"/><rect class="density-original" x="45" y="60" width="250" height="160"/><rect id="density-area" class="density-area" x="45" y="92" width="312.5" height="128"/><g id="flow-particles"></g><g class="demo-labels"><text x="23" y="65">1</text><text x="17" y="145">½</text><text x="41" y="241">0</text><text x="291" y="241">1</text><text x="541" y="241">2</text><text x="10" y="19">pₜ</text><text x="591" y="222">x</text></g></svg><div class="demo-controls"><button id="flow-play" type="button" aria-label="播放概率运输演示">播放</button><label for="flow-time">时间 t</label><input id="flow-time" type="range" min="0" max="100" step="1" value="25"><output for="flow-time" id="flow-time-value">0.25</output></div><div class="demo-metrics"><span>区间长度 <b id="flow-length">1.25</b></span><span>密度 <b id="flow-density">0.80</b></span><span>概率质量 <b>1.00</b></span></div><p class="figure-note">ψₜ(x) = (1+t)x，X₀ ~ Uniform[0,1]。虚线表示初始密度，蓝色表示当前密度；圆点表示固定初值的运动。无需重新采样。</p><noscript><p>当前展示 t = 0.25：区间长度 1.25，密度 0.8，总概率 1。启用 JavaScript 可拖动时间。</p></noscript></figure>';
const strip = '<figure class="concept-strip"><div><span>01 / VELOCITY</span><strong>速度场</strong><p>此刻该怎么走</p></div><i aria-hidden="true">→</i><div><span>02 / FLOW</span><strong>粒子轨迹</strong><p>从起点走到哪里</p></div><i aria-hidden="true">→</i><div><span>03 / DISTRIBUTION</span><strong>分布运输</strong><p>所有点形成什么分布</p></div></figure>';
const actionDiagram = '<figure class="action-diagram"><div class="condition-row"><span>图像</span><span>语言指令</span><span>机器人状态</span><b>固定条件 c ↓</b></div><div class="action-flow"><div><small>NOISE</small><strong>A₀</strong><span>112 维</span></div><p>条件速度场 uθ<br><span>→ ODE 积分 →</span></p><div><small>ACTION CHUNK</small><strong>A₁</strong><span>16 步 × 7 维</span></div></div><figcaption>被运输的是整个动作块；条件负责影响它如何移动。</figcaption></figure>';

for (const post of posts) {
  const math = [];
  let source = fs.readFileSync(path.join(toolsDir, "content", post.source), "utf8");
  source = source.replace(/\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g, (_, block, inline) => {
    const index = math.length;
    const rendered = formula((block || inline).trim(), Boolean(block));
    math.push(block ? '<div class="equation" tabindex="0" role="region" aria-label="数学公式，可横向滚动">' + rendered + "</div>" : rendered);
    return block ? "\n\nMATHBLOCK" + index + "TOKEN\n\n" : "MATHINLINE" + index + "TOKEN";
  });
  let html = marked.parse(source);
  html = html.replace(/<p>MATHBLOCK(\d+)TOKEN<\/p>/g, (_, i) => math[+i]);
  html = html.replace(/MATHINLINE(\d+)TOKEN/g, (_, i) => math[+i]);
  html = html.replace("<!-- flow-demo -->", demo).replace("<!-- concept-strip -->", strip).replace("<!-- action-diagram -->", actionDiagram);
  html = html.replace(/<table>/g, '<div class="table-scroll" tabindex="0" role="region" aria-label="内容对照表，可横向滚动"><table>').replace(/<\/table>/g, "</table></div>");
  const headings = [];
  html = html.replace(/<h2>([\s\S]*?)<\/h2>/g, (_, title) => {
    const id = "section-" + (headings.length + 1);
    headings.push({ id, title: title.replace(/<[^>]+>/g, "") });
    return '<h2 id="' + id + '">' + title + '</h2>';
  });
  const toc = headings.map((h) => '<a href="#' + h.id + '">' + h.title + '</a>').join("");
  const body = '<main id="main"><div class="article-shell" id="top"><nav class="breadcrumbs" aria-label="面包屑"><a href="../../">BLOG</a><span>/</span><a href="../">' + escape(post.series) + '</a><span>/</span><span>笔记 ' + post.number + '</span></nav><header class="article-heading"><p class="eyebrow">' + escape(post.series) + ' / NOTE ' + post.number + '</p><h1>Flow-从随机变量到<br class="desktop-break">确定性 Markov 过程</h1><p class="article-subtitle">一条连接粒子轨迹、概率分布与条件动作生成的概念路径。</p><div class="article-meta"><span>谭圣涵</span><time datetime="' + post.date + '">' + post.date.replaceAll("-", ".") + '</time><span>' + post.minutes + ' 分钟阅读</span><span>中文笔记</span></div><div class="article-art">' + flowArt() + '<p>ONE VECTOR FIELD.<br>MANY INITIAL STATES.</p></div></header><div class="reading-layout"><aside class="toc-desktop"><p class="eyebrow">ON THIS PAGE</p><nav aria-label="文章目录">' + toc + '</nav><a class="toc-back" href="../">← 返回系列目录</a></aside><div class="reading-column"><details class="toc-mobile"><summary>本文目录 <span>展开 / 收起</span></summary><nav aria-label="移动端文章目录">' + toc + '</nav></details><article class="prose">' + html + '</article><nav class="article-end" aria-label="继续阅读"><a href="../"><small>继续这段旅程</small><strong>Flow matching之旅 <span>↗</span></strong></a><a href="../../">全部技术博客 →</a></nav></div></div></div></main>';
  const dest = path.join(outputDir, articlePath(post));
  fs.mkdirSync(dest, { recursive: true });
  const pageBody = body
    .replace('Flow-从随机变量到<br class="desktop-break">确定性 Markov 过程', escape(post.title).replace("到确定性", '到<br class="desktop-break">确定性'))
    .replace("一条连接粒子轨迹、概率分布与条件动作生成的概念路径。", escape(post.subtitle || post.description))
    .replace('<strong>Flow matching之旅 <span>', '<strong>' + escape(post.series) + ' <span>');
  fs.writeFileSync(path.join(dest, "index.html"), shell({ title: post.title, description: post.description, relative: "../../", body: pageBody, canonical: articlePath(post), article: true }));
  console.log("Built:", articlePath(post), "—", headings.length, "sections,", math.length, "formulas");
}
