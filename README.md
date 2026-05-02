# SuperSkin

**通过一张图片自动化制作 Minecraft 皮肤，支持编辑、预览、云端同步**

## 项目简介

SuperSkin 是一款独立的桌面应用程序，帮助用户轻松创建和编辑 Minecraft 皮肤。用户可以上传任意图片，自动转换为标准 Minecraft 皮肤格式，并使用内置的像素编辑器进行精细调整。

### 核心功能

- **图片转皮肤**: 上传图片自动转换为 64x64 标准 Minecraft 皮肤格式
- **像素编辑器**: 内置专业像素绘制工具，支持撤销/重做
- **3D 预览**: 实时 3D 预览皮肤效果，支持旋转和动画
- **用户系统**: 登录注册，云端同步皮肤数据
- **皮肤库管理**: 管理本地和云端皮肤，支持公开分享

## 技术栈

### 应用端

| 技术 | 版本 | 用途 |
|------|------|------|
| Tauri | 2.x | 跨平台桌面应用框架 |
| React | 18.x | 前端 UI 框架 |
| TypeScript | 5.x | 类型安全 |
| Ant Design | 5.x | UI 组件库 |
| Zustand | 4.x | 状态管理 |
| Three.js | - | 3D 渲染引擎 |
| SQLite | - | 本地数据存储 |

### 服务端

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | 18+ | 运行时环境 |
| NestJS | 10.x | 后端框架 |
| PostgreSQL | 15+ | 关系型数据库 |
| Prisma | 5.x | ORM |
| JWT | - | 身份认证 |
| Passport.js | - | 认证中间件 |

## 项目结构

```
SuperSkin/
├── apps/
│   ├── client/              # Tauri + React 客户端
│   │   ├── src/             # React 源码
│   │   │   ├── components/  # UI 组件
│   │   │   ├── pages/       # 页面
│   │   │   ├── layouts/     # 布局
│   │   │   ├── stores/      # 状态管理
│   │   │   └── utils/       # 工具函数
│   │   └── src-tauri/       # Tauri 配置
│   │
│   └── server/              # NestJS 服务端
│       ├── src/
│       │   ├── modules/     # 功能模块
│       │   │   ├── auth/    # 认证模块
│       │   │   ├── users/   # 用户模块
│       │   │   └── skins/   # 皮肤模块
│       │   └── common/      # 公共组件
│       └── prisma/          # 数据库模型
│
├── packages/
│   └── shared/              # 共享类型定义
│
├── Plan.md                  # 开发计划
├── Report.md                # 进度报告
└── README.md                # 项目说明
```

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 9.0
- Rust >= 1.70 (Tauri)
- PostgreSQL >= 15

### 安装依赖

```bash
# 安装 pnpm (如未安装)
npm install -g pnpm

# 安装项目依赖
pnpm install
```

### 开发模式

```bash
# 启动客户端开发服务器
pnpm dev:client

# 启动服务端开发服务器
pnpm dev:server
```

### 数据库配置

```bash
# 进入服务端目录
cd apps/server

# 复制环境变量配置
cp .env.example .env

# 生成 Prisma 客户端
pnpm prisma:generate

# 运行数据库迁移
pnpm prisma:migrate
```

### 构建生产版本

```bash
# 构建客户端
pnpm build:client

# 构建服务端
pnpm build:server
```

## API 文档

服务端启动后访问: `http://localhost:3004/api/docs`

### 主要接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/auth/register | 用户注册 |
| POST | /api/auth/login | 用户登录 |
| GET | /api/auth/profile | 获取用户信息 |
| GET | /api/skins | 获取皮肤列表 |
| POST | /api/skins | 创建皮肤 |
| PUT | /api/skins/:id | 更新皮肤 |
| DELETE | /api/skins/:id | 删除皮肤 |

## 开发规范

### Git 提交规范

| 前缀 | 描述 |
|------|------|
| feat | 新功能 |
| fix | 修复 Bug |
| docs | 文档更新 |
| style | 代码格式 |
| refactor | 代码重构 |
| test | 测试相关 |
| chore | 构建/工具 |

### 设计规范

- 主色调: `#0055B9`
- 背景色: `#FFFFFF`
- 风格: 简洁轻量化

## 开发者

**北域工作室**

## 许可证

MIT License
