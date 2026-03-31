# Envra

[简体中文文档](./README.zh-CN.md)

Envra is a desktop app built with Tauri 2 + React + Vite + Tailwind CSS v4 + shadcn/ui.
It focuses on developer environment management and provides a clean dashboard-style UI for setup and diagnostics.

## Current Status

This project is currently a frontend-first prototype:

- Core pages and navigation are implemented.
- Bilingual UI (`zh` and `en`) is available.
- Most data shown on pages is mock/demo data for now.

## Features

- Dashboard overview for environment and quick actions
- Environment Doctor page with scan/fix style interactions
- Tool Manager page for installed/available tools
- Project Init page for template and runtime selections
- Settings page (theme, language, registry, path, proxy)
- Persistent locale state with Zustand + persist middleware

## Tech Stack

- Tauri 2
- React 19
- Vite 7
- Tailwind CSS v4
- shadcn/ui components
- TypeScript
- Zustand

## Prerequisites

- Node.js 20+ (Node.js 22 recommended)
- npm 10+
- Rust toolchain (rustup, cargo, rustc)
- Xcode Command Line Tools on macOS

## Quick Start

```bash
npm install
npm run tauri dev
```

## Local Build

```bash
npm run tauri build
```

Build outputs are generated in:

```text
src-tauri/target/release/bundle/
```

## Publish to GitHub Releases

This repository includes workflow:

- `.github/workflows/release.yml`

The workflow triggers on tags like `v0.1.7`, builds for macOS/Linux/Windows, and uploads artifacts to GitHub Releases.

### Release Steps

1. Commit and push your latest changes.
2. Create and push a tag:

```bash
git tag v0.1.7
git push origin v0.1.7
```

3. Open GitHub Actions and wait for the `Release` workflow to finish.
4. Find packaged binaries in the corresponding GitHub Release page.

### macOS One-Line Installer

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/lengziyu/Envra/main/scripts/install-macos.sh)
```

## Project Structure

```text
src/                 # React UI and pages
src/components/      # Layout and UI components
src/i18n/            # zh/en translation resources
src-tauri/           # Rust entry and Tauri config
.github/workflows/   # CI/CD workflows (release pipeline)
```

## Troubleshooting

- `cargo: command not found`:
  - Ensure Rust is installed and cargo is in PATH.
- `Port 1420 is already in use`:
  - Stop the process using port 1420, then rerun `npm run tauri dev`.
- macOS says app is damaged/cannot open:
  - Prefer downloading the `.dmg` artifact from Releases.
  - If this is an unsigned build, remove quarantine flag:
    - `xattr -cr /Applications/Envra.app`
  - For production distribution, configure Apple signing/notarization secrets in GitHub Actions:
    - `APPLE_CERTIFICATE`
    - `APPLE_CERTIFICATE_PASSWORD`
    - `APPLE_SIGNING_IDENTITY`
    - `APPLE_ID`
    - `APPLE_PASSWORD`
    - `APPLE_TEAM_ID`
