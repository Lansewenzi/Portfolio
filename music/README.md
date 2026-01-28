# 🎵 Cloud Music Player (云音乐)

一个基于原生 JavaScript 和 Tailwind CSS 构建的现代 Web 音乐播放器。
无需构建工具，开箱即用。界面优雅，支持多端适配，聚合了主流音乐平台的搜索与播放功能。

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)
![Vanilla JS](https://img.shields.io/badge/Vanilla_JS-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

## ✨ 功能特性 (Features)

### 核心功能
- **多源聚合**：支持 **网易云音乐**、**QQ音乐**、**酷我音乐** 的排行榜查看与关键词搜索。
- **无损音质**：支持标准 (128k)、高品 (320k) 以及 **无损 (FLAC)** 音质切换与下载。
- **歌词同步**：内置 LRC 歌词解析器，支持桌面端与移动端的歌词实时滚动。

### 交互体验
- **沉浸式 UI**：基于 Glassmorphism (毛玻璃) 设计风格，背景随封面动态模糊。
- **响应式设计**：
  - **桌面端**：完整的侧边栏导航、全屏播放器、键盘快捷键支持。
  - **移动端**：适配触摸操作，点击封面即可切换 封面/歌词 视图。
- **播放队列**：支持添加下一首播放、查看历史队列、清空列表。
- **状态记忆**：自动通过 LocalStorage 保存播放列表、音量设置和播放模式，刷新不丢失。

### 播放控制
- **模式切换**：支持 顺序播放、列表循环、单曲循环。
- **键盘快捷键**：支持原生级别的快捷键操作（详见下文）。



## 🖥️ 界面预览

![](.\screenshot.png)



## 🚀 快速开始 (Getting Started)

本项目采用 **Zero-Build** 架构，无需安装 Node.js 或运行构建命令。

### 方法 1：直接运行
1. 克隆或下载本项目到本地。
2. 双击打开 `index.html` 即可运行。

### 方法 2：部署到服务器 (推荐)
只需将所有文件上传至您的 Nginx/Apache 网站根目录。



## ⚙️ 配置说明

项目核心配置位于 `script.js` 顶部：

```javascript
const API_BASE_URL = 'https://music-dl.sayqz.com/api/';  // 音乐 API 接口地址
```

**注意**：本项目依赖后端 API 进行音乐解析。如果默认接口失效，请自行搭建或替换为兼容的音乐解析 API。



## ⌨️ 键盘快捷键 (Shortcuts)

| **按键**       | **功能**              |
| -------------- | --------------------- |
| `Space` (空格) | 播放 / 暂停           |
| `Ctrl` + `←`   | 上一首                |
| `Ctrl` + `→`   | 下一首                |
| `←` / `→`      | 快退 / 快进 (5秒)     |
| `↑` / `↓`      | 音量调节              |
| `M`            | 静音 / 取消静音       |
| `Esc`          | 关闭详情页 / 关闭弹窗 |



## 🛠️ 技术栈

- **结构 (Structure)**: HTML5 (Semantic)
- **样式 (Styling)**: Tailwind CSS (via CDN) + Custom CSS variables
- **逻辑 (Logic)**: Vanilla JavaScript (ES6+), Fetch API



## ⚠️ 免责声明 (Disclaimer)

1. 本项目仅供 **学习和技术研究** 使用，旨在展示前端开发技术（HTML/JS/Tailwind）。
2. 项目中的音乐数据来源于第三方接口，本项目 **不存储** 任何音乐文件或版权内容。
3. 请勿将本项目用于任何商业用途，请尊重版权，支持正版音乐。



## 📄 License

[MIT License](https://www.google.com/search?q=LICENSE)