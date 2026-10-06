# 技术博客维护

博客是独立静态页面，首页只保留 BLOG 导航入口，不显示文章正文。

## 目录

- `content/*.md`：文章正文，使用 Markdown 编写。
- `posts.json`：文章标题、系列、地址、日期与简介。
- `series.json`：各系列独立的简介、目录页导语和示意图类型。系列顺序沿用 `posts.json` 中首次出现的顺序。
- `build-blog.mjs`：生成博客首页、系列目录、文章和数学公式。
- `vln-catalog.mjs`：接入完整的 VLN HTML 调研目录，保留正文、实验表与搜索交互。
- 本地 `docs/blog/blog.css` / 发布仓库 `blog/blog.css`：博客样式。
- 本地 `docs/blog/blog.js` / 发布仓库 `blog/blog.js`：主题、阅读进度、目录和互动示意图。

## 修改现有文章

编辑 `content/flow-foundations.md`，然后执行：

```bash
cd site-tools
npm ci
npm run build
npm test
```

脚本会自动识别本地 `docs/` 布局及 GitHub Pages 仓库根目录布局。也可通过 `SITE_OUTPUT_DIR` 指定站点目录。
正文的 `$...$` 和 `$$...$$` 会在构建时转换为 KaTeX HTML + MathML；格式错误会让构建失败。
字体与样式均本地化，读者不需要访问公式 CDN。不要提交 `node_modules/`。

## 新增文章

1. 在 `content/` 新建 Markdown 文件，不写一级标题（页面标题来自元数据），正文使用 `##` 和 `###`。
2. 在 `posts.json` 添加一条记录，填写 `title`、`slug`、`series`、`seriesSlug`、`number`、`date`、`description`、`subtitle`、`tags`、`source` 和预计阅读时间 `minutes`。
3. 系列内文章共用 `seriesSlug`；每篇文章使用唯一 `slug`。日期格式为 `YYYY-MM-DD`。
4. 运行构建，检查生成的目录和正文，再提交发布。

当前文章地址：`/blog/flow-matching/flow-random-variables-deterministic-markov/`。

首篇现标题为「从 Flow ，Velocity Field 到 CNF」，为保持外链可用，沿用原地址。可用 `updated` 字段显示修订日期。

交互图由 `flow-visuals.mjs` 生成静态 SVG，浏览器逻辑与解析函数在 `blog/flow-visuals.js`，样式在 `blog/flow-visuals.css`。Markdown 使用 `<!-- affine-demo -->`、`<!-- continuity-demo -->`、`<!-- cnf-training-demo -->` 插入。构建和浏览器共用计算函数，部署时需同步这些文件。

博客的数学交互示例只用于 Flow 笔记。新增系列时，在 `series.json` 配置独立介绍；`art` 可选 `flow`、`navigation` 或 `none`，不要复用不相关的 Flow 介绍。

## VLN Voyager · Part 01

文章地址：`/blog/vln-voyager/agentic-vln/`，显示标题为「Agentic VLN」。

- 原始 HTML 快照保存在 `content/agentic-vln/vln-paper-catalog.html`，本地框架图保存在同目录 `pic/` 下；构建和发布不依赖工作区之外的原文件。
- `posts.json` 使用 `format: "catalog"`，由独立导入器生成页面，不走 Flow 的 Markdown／公式模板。用 `readingLabel` 显示「54 篇论文 · 可检索文献笔记」，而非整页预计阅读分钟。
- 2026-10-06 同步最新版：54 篇论文、113 条实验结果、57 张图片（17 张本地图片）。保留原目录时间顺序、年份／多标签筛选、数值排序、开源状态标识与侧边目录；图片保持原始出处，远程图片保留加载失败提示。
- 本地 MathJax 配置、渲染器与许可证位于 `content/agentic-vln/assets/`，构建时校验脚本摘要并随文章部署，支持 TeX 渲染和原生 MathML 回退。原始检索数据中的两处本机 PDF 绝对路径仅保留文件名，避免公开私人目录。
- 原文件引用的 CSV、Markdown、JSON 附件并未提供，发布页面不显示这些失效下载入口。
- 如需更新此篇，替换快照和相关本地资源后重新构建并运行测试。导入器会检查脚本安全；若原目录的交互代码发生变化，需要先审查代码再更新导入规则。
- `test-vln-blog.mjs` 检查系列顺序、论文与实验内容完整性、本地资源、锚点及导航；原有 `test-blog.mjs` 继续保护 Flow 文章与数学交互。

## 本地预览与发布

### 套牢研究 · 宝丰能源分析

系列地址：`/blog/taolao-research/`；首篇文章：`/blog/taolao-research/baofeng-energy/`。

- 原始单文件报告快照位于 `content/baofeng-energy/report.html`，无需依赖 Downloads 目录。
- `posts.json` 使用 `format: "standalone-report"`；`standalone-report.mjs` 保留原始样式、数据、模型脚本与来源链接，仅更新文章标题并增加 BLOG／系列／个人主页导航。
- 保留原报告研究日期及数据口径，不抓取实时行情、不改写数据或投资判断；情景测算不是公司预测或投资建议。
- 更新报告时替换快照并构建；若交互脚本变化，需要先审查再更新导入器中的 SHA-256 白名单。`test-stock-blog.mjs` 检查内容和交互脚本是否保持一致、目录顺序与导航是否有效。

### 预览与发布方式

“套牢研究”第二篇为「顺丰控股分析」，地址 `/blog/taolao-research/sf-holding/`。原始单文件快照为 `content/sf-holding/report.html`，同样使用 `standalone-report` 导入，保留十年财务、业务图表、分部利润与数据导出。只更新博客标题和返回导航，不改写原始财务内容；测试同时保护宝丰能源与顺丰两篇报告。

在本地大工作区根目录运行 `python3 -m http.server 4173 --directory docs`；在独立 GitHub Pages 仓库根目录运行 `python3 -m http.server 4173`。
打开 `http://localhost:4173/blog/`。构建无需在 GitHub 上运行，提交生成后的 HTML、CSS、JS、字体和源码即可。

GitHub Pages 当前从 `tanshenghan/tanshenghan.github.io` 的 `main` 分支根目录发布。
