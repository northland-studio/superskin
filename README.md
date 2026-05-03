# SuperSkin

<p align="center">
  <img src="https://img.shields.io/badge/license-GPL%203.0-blue.svg" alt="License: GPL 3.0" />
  <img src="https://img.shields.io/badge/rust-1.70+-orange.svg" alt="Rust 1.70+" />
  <img src="https://img.shields.io/badge/node-18+-green.svg" alt="Node 18+" />
  <img src="https://img.shields.io/badge/Tauri-2.x-purple.svg" alt="Tauri 2.x" />
  <img src="https://img.shields.io/badge/React-18.x-blue.svg" alt="React 18" />
  <img src="https://img.shields.io/badge/NestJS-10.x-red.svg" alt="NestJS 10" />
</p>

<p align="center">
  <b>🧊 从一张照片生成 Minecraft 皮肤 — 支持 AI 姿态检测、3D 预览、云端同步</b>
</p>

---

## ✨ 功能磁贴

<table>
<tr>
  <td width="33%">
    <h3>🖼️ 图片转皮肤</h3>
    <p>上传任意人物照片，AI 自动检测姿态和身体部位，一键生成标准 64×64 Minecraft 皮肤</p>
  </td>
  <td width="33%">
    <h3>✏️ 像素编辑器</h3>
    <p>内置专业像素绘制工具，支持 512×512 放大编辑、撤销/重做，精细调整每个像素</p>
  </td>
  <td width="33%">
    <h3>🌐 3D 实时预览</h3>
    <p>基于 Three.js 的 Minecraft 标准皮肤模型，支持旋转、缩放、四肢动画</p>
  </td>
</tr>
<tr>
  <td>
    <h3>☁️ 云端同步</h3>
    <p>登录后一键上传/下载皮肤到云端服务器，多设备共享你的创作</p>
  </td>
  <td>
    <h3>📂 皮肤库管理</h3>
    <p>本地皮肤库支持编辑、删除、导出，磁贴式预览图展示</p>
  </td>
  <td>
    <h3>🔐 用户系统</h3>
    <p>注册、邮箱验证、JWT 登录，安全可靠的身份认证</p>
  </td>
</tr>
<tr>
  <td>
    <h3>🤖 AI 姿态检测</h3>
    <p>集成 YOLOv8s-pose 模型，MediaPipe + ONNX 混合检测人体关键点</p>
  </td>
  <td>
    <h3>🎯 背景去除</h3>
    <p>智能图像分割，自动去除照片背景，保留人物主体</p>
  </td>
  <td>
    <h3>📝 文件日志</h3>
    <p>可执行文件目录下自动生成 .log 文件，方便排查问题</p>
  </td>
</tr>
</table>

## 🏗️ 技术栈

### 客户端 (Tauri + React)

| 技术 | 用途 |
|------|------|
| Tauri 2.x | 跨平台桌面应用框架 |
| React 18 + TypeScript | 前端 UI |
| Ant Design 5 | UI 组件库 |
| Zustand | 状态管理 |
| Three.js + React Three Fiber | 3D 渲染 |
| @react-three/drei | 3D 辅助工具 |
| SQLite (rusqlite) | 本地数据存储 |
| MediaPipe + ONNX Runtime Web | AI 姿态检测 |

### 服务端 (NestJS)

| 技术 | 用途 |
|------|------|
| NestJS 10 | 后端框架 |
| PostgreSQL + Prisma | 数据库 |
| JWT + Passport.js | 身份认证 |
| Multer | 文件上传 |
| Nodemailer | 邮件验证 |

## 📁 项目结构

```
SuperSkin/
├── apps/
│   ├── client/              # Tauri + React 客户端
│   │   ├── src/             # React 源码
│   │   │   ├── components/  # SkinPreview3D, PixelEditor 等
│   │   │   ├── pages/       # Editor, Gallery, Login, Register
│   │   │   ├── stores/      # skinStore, userStore
│   │   │   ├── services/    # api.ts (Rust HTTP 调用)
│   │   │   └── utils/       # skinConverter, logger
│   │   └── src-tauri/       # Rust 源码
│   │       └── src/         # commands, database, main
│   │
│   └── server/              # NestJS 服务端
│       ├── src/modules/
│       │   ├── auth/        # 注册/登录/JWT
│       │   ├── skins/       # 皮肤 CRUD
│       │   └── upload/      # 文件上传
│       └── prisma/          # 数据库 Schema
│
├── packages/shared/         # 共享类型
├── LICENSE                  # GPL-3.0
├── Plan.md                  # 开发计划
└── Report.md                # 进度报告
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 9.0
- Rust >= 1.70 (含 `rustup` + `wasm32-unknown-unknown` target)
- PostgreSQL >= 15

### 安装依赖

```bash
pnpm install
```

### 开发

```bash
pnpm dev:client    # Tauri 客户端（开发模式）
pnpm dev:server    # NestJS 服务端（开发模式）
```

### 构建

```bash
pnpm build:client  # 生成 .exe/.msi 安装包
pnpm build:server  # 构建服务端
```

构建产物位于 `apps/client/src-tauri/target/release/bundle/`

## 📡 API 文档

服务端启动后访问 `http://localhost:3004/api/docs` (Swagger)

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | /api/auth/register | 否 | 用户注册 |
| POST | /api/auth/login | 否 | 用户登录 |
| POST | /api/auth/verify-email | 否 | 邮箱验证 |
| GET | /api/auth/profile | JWT | 获取用户信息 |
| GET | /api/skins | JWT | 获取皮肤列表 |
| POST | /api/skins | JWT | 创建皮肤 |
| PUT | /api/skins/:id | JWT | 更新皮肤 |
| DELETE | /api/skins/:id | JWT | 删除皮肤 |
| POST | /api/upload/skin | JWT | 上传皮肤文件 |

## 🔗 仓库地址

- **GitHub**: [northland-studio/superskin](https://github.com/northland-studio/superskin)
- **Gitee**: [morzane123/superskin](https://gitee.com/morzane123/superskin)

## 📜 开源协议

本项目采用 [GNU General Public License v3.0](LICENSE) 开源协议。

SuperSkin - Copyright (C) 2025-2026 北域工作室

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

## 👨‍💻 开发者

**北域工作室** — Minecraft 皮肤生成与编辑工具
