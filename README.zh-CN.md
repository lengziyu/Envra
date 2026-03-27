# Envra

[English Documentation](./README.md)

Envra 是一个基于 Tauri 2 + React + Vite + Tailwind CSS v4 + shadcn/ui 的桌面应用，目标是提供开发环境管理与诊断体验。

## 当前状态

项目目前属于前端原型阶段：

- 已完成主要页面与导航结构。
- 已支持中英文双语界面（`zh` / `en`）。
- 页面中的工具与环境信息目前多为演示数据（mock data）。

## 功能概览

- 仪表盘：环境概览与快捷入口
- 环境诊断：扫描与修复交互
- 工具管理：已安装/可安装工具列表
- 项目初始化：模板、Node 版本、包管理器选择
- 设置中心：主题、语言、镜像源、安装路径、代理
- 使用 Zustand 持久化语言设置

## 技术栈

- Tauri 2
- React 19
- Vite 7
- Tailwind CSS v4
- shadcn/ui
- TypeScript
- Zustand

## 环境要求

- Node.js 20+（推荐 Node.js 22）
- npm 10+
- Rust 工具链（rustup、cargo、rustc）
- macOS 需要安装 Xcode Command Line Tools

## 本地开发

```bash
npm install
npm run tauri dev
```

## 本地打包

```bash
npm run tauri build
```

打包产物默认在：

```text
src-tauri/target/release/bundle/
```

## 发布到 GitHub Releases

仓库已内置自动发布工作流：

- `.github/workflows/release.yml`

当你推送 `v*` 格式标签（例如 `v0.1.0`）后，工作流会在 macOS / Linux / Windows 构建并上传安装包到 GitHub Releases。

### 发布步骤

1. 提交并推送最新代码。
2. 创建并推送版本标签：

```bash
git tag v0.1.0
git push origin v0.1.0
```

3. 打开 GitHub Actions，等待 `Release` 工作流完成。
4. 到仓库的 Releases 页面下载对应平台的安装包。

## 目录结构

```text
src/                 # React 页面与逻辑
src/components/      # 布局和 UI 组件
src/i18n/            # 中英文文案资源
src-tauri/           # Rust 入口与 Tauri 配置
.github/workflows/   # CI/CD 工作流（自动发布）
```

## 常见问题

- `cargo: command not found`：
  - Rust 已安装但 PATH 未生效，需补充 cargo 路径。
- `Port 1420 is already in use`：
  - 结束占用 1420 端口的进程后重试 `npm run tauri dev`。
- macOS 提示“应用已损坏，无法打开”：
  - 建议优先下载 Releases 中的 `.dmg` 安装包。
  - 若为未签名构建，可先移除隔离属性：
    - `xattr -cr /Applications/Envra.app`
  - 正式分发建议在 GitHub Actions 配置 Apple 签名/公证 secrets：
    - `APPLE_CERTIFICATE`
    - `APPLE_CERTIFICATE_PASSWORD`
    - `APPLE_SIGNING_IDENTITY`
    - `APPLE_ID`
    - `APPLE_PASSWORD`
    - `APPLE_TEAM_ID`
