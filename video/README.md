# 🎬 全网视频解析 (Video Parser)

一个简洁、轻量级且响应式的在线视频解析工具。
基于原生 HTML/CSS/JS 构建，聚合了多个主流的视频解析接口，旨在提供便捷的视频播放体验。

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/Vanilla_JS-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)



## ✨ 功能特性 (Features)

- **多线路支持**：内置 10+ 条优质解析线路，支持下拉菜单一键切换，应对接口失效情况。
- **全平台支持**：支持爱奇艺、腾讯视频、优酷、芒果TV、Bilibili 等主流视频网站的链接解析。
- **响应式设计**：
  - **移动端优先**：针对手机屏幕进行了深度优化，自动适配布局。
  - **自适应播放器**：播放器区域保持 16:9 黄金比例，视觉体验舒适。
- **轻量级架构**：无需后端服务器，纯静态页面，部署简单（支持 GitHub Pages）。
- **安全验证**：内置 URL 合法性检测，防止非 HTTP/HTTPS 协议的错误输入。



## 🖥️ 界面预览

> *`screenshot.png`*



## 🚀 快速开始 (Getting Started)

本项目无需安装 Node.js 或任何构建工具，下载即用。

### 方法 1：直接运行
1. 克隆本项目到本地：
   ```bash
   git clone [https://github.com/Lansewenzi/Portfolio.git](https://github.com/Lansewenzi/Portfolio.git)

2. 双击打开 `index.html` 即可运行。

### 方法 2：部署到服务器

只需将所有文件上传至您的 Nginx/Apache 网站根目录，或直接推送到 GitHub Pages 即可在线访问。



## ⚙️ 配置与自定义

### 修改解析接口

如果您想添加或修改解析线路，请编辑 `index.html` 中的 `<select id="jk">` 部分：

```html
<select class="url-c url-text" id="jk">
    <option value="[https://example.com/api/?url=](https://example.com/api/?url=)">线路1</option>
</select>
```

### 修改支持平台图标

支持的平台列表位于 `index.html` 的 `logo-box` 区域，您可以根据需要替换 `images/` 文件夹下的图标文件。



## 🛠️ 技术栈

- **Core**: HTML5 (Semantic Structure)
- **Styling**: CSS3 (Flexbox, CSS Variables, Responsive Media Queries)
- **Scripting**: Vanilla JavaScript (ES6)



## ⚠️ 免责声明 (Disclaimer)

1. **仅供学习使用**：本项目仅是一个前端网页界面（UI Shell），用于学习 HTML/CSS 布局与 iframe 交互技术。
2. **第三方数据**：本项目 **不存储** 任何视频文件，所有解析服务均由第三方接口（如 `im1907.top` 等）提供。本项目无法控制第三方接口的稳定性与内容合法性。
3. **版权说明**：请尊重版权，支持正版影视。严禁将本项目用于任何商业用途或非法传播盗版内容。
4. **使用风险**：用户使用本工具产生的一切后果由用户自行承担，开发者不承担任何法律责任。



## 📄 License

[MIT License](https://www.google.com/search?q=LICENSE)