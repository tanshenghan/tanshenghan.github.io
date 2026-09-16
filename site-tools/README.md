# 技术博客维护

博客是独立静态页面，首页只保留 BLOG 导航入口，不显示文章正文。

## 目录

- `content/*.md`：文章正文，使用 Markdown 编写。
- `posts.json`：文章标题、系列、地址、日期与简介。
- `build-blog.mjs`：生成博客首页、系列目录、文章和数学公式。
- 本地 `docs/blog/blog.css` / 发布仓库 `blog/blog.css`：博客样式。
- 本地 `docs/blog/blog.js` / 发布仓库 `blog/blog.js`：主题、阅读进度、目录和互动示意图。

## 修改现有文章

编辑 `content/flow-foundations.md`，然后执行：

```bash
cd site-tools
npm ci
npm run build
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

博客的 SVG 图示与交互示例是针对首篇 Flow 笔记设计的。新增其他系列时，可在构建脚本中调整系列简介与文章插图。

## 本地预览与发布

在本地大工作区根目录运行 `python3 -m http.server 4173 --directory docs`；在独立 GitHub Pages 仓库根目录运行 `python3 -m http.server 4173`。
打开 `http://localhost:4173/blog/`。构建无需在 GitHub 上运行，提交生成后的 HTML、CSS、JS、字体和源码即可。

GitHub Pages 当前从 `tanshenghan/tanshenghan.github.io` 的 `main` 分支根目录发布。
