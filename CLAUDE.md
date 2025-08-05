# CLAUDE.md

本文件为 Claude Code（claude.ai/code）在操作本代码仓库时提供指导。

## 项目概述

WebPluck 是一个 Chrome 扩展（Manifest V3），允许用户通过类名点击网页上的特定 DOM 元素。该扩展提供了一个弹出界面，用户可以在其中输入 CSS 类选择器，自动点击匹配的元素。

## 架构

### 核心组件

**扩展结构：**
- `manifest.json` - Chrome 扩展清单（V3）
- `background.js` - 扩展生命周期的服务工作者
- `content.js` - 注入到网页中的内容脚本
- `popup.js/popup.html` - 扩展弹出界面
- `styles.css` - 共享样式

**消息流：**
1. 用户在弹出界面中输入类名（`popup.js`）
2. 弹出界面通过 `chrome.tabs.sendMessage()` 向内容脚本发送消息
3. 内容脚本（`content.js`）使用 `document.querySelectorAll()` 查询 DOM
4. 内容脚本点击找到的元素，并将计数返回给弹出界面
5. 状态显示在弹出界面中

**关键功能：**
- `content.js` 处理 `clickElements`/`clickDivs` 操作
- 支持以空格分隔的类名作为 CSS 选择器
- 使用 `DOMContentLoaded` 回退检查 DOM 就绪状态
- 全面的错误处理和日志记录，前缀为 `[WebPluck]`

### 权限与安全
- `activeTab` - 访问当前标签页
- `scripting` - 内容脚本注入
- `<all_urls>` - 内容脚本在所有网站上运行

## 测试

删除所有测试环境代码。删除jest测试，并在 README 中删除「功能测试指南」章节。

## 文件结构说明

- 删除所有无用的文件和目录以及代码
- 所有中文注释表明该项目面向中文用户
- 清单中的扩展名称与 package.json 不同（“Div Clicker” vs “webpluck”）。全部使用“Div Clicker”。
- `manifest.json` - 命名空间为“div-clicker”

## 项目功能说明（重点关注）

- 希望点击的div标签class="class1 class2 class3"，而且该类型div标签有多个。
- 部分div标签在class="class4"的多个标签点击之后，才会显示在动态加载dom中。
- 我希望点击查询后在当前初始页面查找class="class1 class2 class3"的标签，并依次点击它们。
- 点击后，再依次点击所有class="class4"的标签，并且在加载的dom中class="class1 class2 class3"并点击，点击后添加适当的延迟（5000ms）。
- class="class4"标签是固定的，我不希望每次再单独指定，请直接在指定class1 class2 class3并点击查询之后，直接依次点击class="class4"的标签。
- 代码是否需要异步操作，请综合考虑进行改进。
- 确保代码的可读性和可维护性，使用清晰的变量名和注释。删除无用的代码。


