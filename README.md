# 谭圣涵 / Shenghan Tan — Personal Academic Homepage

可直接部署到 GitHub Pages 的中英文学术主页。页面采用原生 HTML、CSS 和 JavaScript，交互地球不依赖第三方库。

## 当前内容

- 中英文切换，并自动记住语言选择
- 深浅色主题
- 个人照片与可交互研究地球
- 北航官方校名标识
- 基于 Natural Earth 1:110m 数据的国家边界覆盖
- 北航本科与硕士教育经历
- 得物、快手、贝塔无限实习经历
- VLNverse ECCV 2026 EMR Challenge 项目与框架图
- 蚂蚁集团 LLM 推理链检验项目
- AAAI 2025 论文
- AI Safety → 推荐系统 → 具身智能与 VLN 的研究路径
- 独立 BLOG 栏目、技术系列目录与数学公式文章；编辑说明见 `site-tools/README.md`

## 图片资源

- `docs/assets/profile.jpg`：个人照片
- `docs/assets/beta-vln-framework.png`：Beta-VLN 系统架构
- `docs/assets/aaai-framework.png`：AAAI 论文框架
- `docs/assets/buaa-logo.png`：北航官网标识
- `docs/assets/countries-110m.json`：Natural Earth / world-atlas 国家边界数据

两张框架图在页面中均可点击查看原图。

## 编辑双语内容

英文内容使用：

```html
<span class="lang-en">English</span>
```

中文内容使用：

```html
<span class="lang-zh">中文</span>
```

如果内容包含多个段落，可以像 About 部分一样分别建立 `.lang-en` 和 `.lang-zh` 容器。

## 本地预览

在独立 GitHub Pages 仓库根目录运行：

```bash
python3 -m http.server 4173
```

访问 `http://localhost:4173/`。在 VLN4BUAA 本地工作区中则增加 `--directory docs` 参数。

## GitHub Pages

在仓库 **Settings → Pages** 中选择：

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/ (root)`

如果希望地址为 `tanshenghan.github.io`，仓库名必须是 `tanshenghan.github.io`。
