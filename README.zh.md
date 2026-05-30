# PetalGen

**AI 图像生成的提示词工程工具，由 [Pollinations.ai](https://pollinations.ai) 驱动**

**[→ 在线演示](https://petalgen.tools4all.ai)** · 🌐 [English](README.md) · [日本語](README.ja.md)

---

## 这是什么（以及它不是什么）

PetalGen 是一个**提示词解析与测试工具**。你粘贴任意 AI 图像提示词——自然语言、JSON 或逗号分隔格式——它会将其分解为 10 个命名模块，供你编辑、锁定、打乱和重新组合。内置的图像生成功能是为了*验证*提示词的改动效果，而非通用图像生成器。

**使用前须知：**

- 在线演示使用 **Pollinations.ai Seed 档位**共享密钥（0.15 pollen/小时 ≈ 每小时 75 张图，使用 Z-Image Turbo）。未注册用户每天**免费生成 5 次**。
- **Z-Image Turbo 是默认模型——这是有意为之的。** 它针对 Seed 档位进行了优化：速度快、pollen 消耗低、稳定可靠。拥有自己 `pk_` 密钥（BYOP）的用户可以切换到管理员已启用的任意模型。自行部署的用户可在管理面板中解锁更多模型。
- **模型列表由管理员管理**。在线演示仅启用了少数几个模型。Fork 此项目后，可通过管理面板解锁任意 Pollinations 模型。
- 图像质量和速度完全取决于所选模型。Z-Image Turbo 速度快且对免费档位友好；GPT Image 或 Seedream 能力更强，但消耗更多 pollen。

如需无限次生成或使用更多模型，请连接你自己的 Pollinations 密钥（参见 [BYOP](#使用自己的-pollinations-密钥)）。

---

## 如何使用

### 工作区（`/`）

核心提示词工程流程：

1. **粘贴**任意图像提示词到输入框——自然语言、JSON 或逗号分隔格式均可
2. **点击魔杖按钮**将其分解为 10 个模块：主体、服装、场景、姿态、灯光、构图、风格、情绪、技术参数、约束条件
3. **编辑**任意模块，使用下拉编辑器——每个模块显示当前值和 3 个 AI 生成的备选项
4. **锁定**打乱时想保留的模块（点击锁定图标）
5. **打乱**一键随机化所有未锁定模块（🎲 按钮）
6. **选择**模型、宽高比，可选择开启增强
7. **生成**⚡ ——图像在预览区渲染
8. **保存**到图库（💾，需主动操作，非自动保存）

> **Z-Image Turbo 说明：** 使用固定参数 `guidance_scale=0.0`，`steps=9`。负向提示词不会转发给 Z-Image——约束条件会被编译到正向提示词中。这是经过确认的设计。

### Token 工厂（`/factory`）

从已采集的 Token 库自下而上构建提示词：

1. 浏览**Token 仓库**（左侧面板）——主体、风格、灯光、场景等分类，每类按频率排序
2. **点击任意值标签**将其插入你的配方
3. 使用**自动填充**按频率加权随机采样各分类
4. 添加**自定义 Token** 以补充库中没有的内容
5. 直接在工厂中生成——与工作区使用相同的模型/宽高比控件

### 图库（`/library`）

你主动保存的图像，支持完整的重混功能：

- 4 列响应式瀑布流布局（4 → 3 → 2 → 1 列）
- **📋 复制** ——将完整编译后的提示词复制到剪贴板
- **⚡ 重混** ——将提示词上下文加载回工作区继续编辑
- 图像存储在 Cloudflare R2，元数据（提示词、模型、尺寸）存储在 D1

---

## 使用自己的 Pollinations 密钥

连接 `pk_` 公开密钥可绕过共享速率限制，使用任意模型：

1. 在 **[enter.pollinations.ai](https://enter.pollinations.ai)** 获取密钥
2. 点击页头的 **🔑 Free API key**
3. 粘贴你的 `pk_` 密钥——仅存储在浏览器本地，不会发送到我们的服务器

> **密钥类型很重要：** 在浏览器中使用 `pk_`（公开）密钥。`sk_`（私密）密钥只能在服务端使用。如果你粘贴了私密密钥，PetalGen 会提醒你。

BYOP 用户完全绕过每天 5 次的速率限制。你的 pollen 余额直接从你的 Pollinations 账户扣除。

---

## 自行部署

部署你自己的实例，使用你自己的模型列表、运营密钥和品牌。

### 前置条件

- [Cloudflare 账户](https://cloudflare.com)（免费档位即可）
- [Pollinations.ai API 密钥](https://enter.pollinations.ai)——服务端运营密钥使用 `sk_`
- Node.js 18+ 和 [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

### 1. 克隆并安装依赖

```bash
git clone https://github.com/your-fork/petalgen
cd petalgen
npm install
```

### 2. 创建 Cloudflare 资源

```bash
# D1 数据库——存储提示词日志、Token、图库、模型注册表
npx wrangler d1 create PETALGEN_DB
# 将返回的 database_id 填入 wrangler.toml

# R2 存储桶——存储生成的图像
npx wrangler r2 bucket create petalgen-images
# 在 CF 控制台为存储桶配置公开自定义域名
# 将该域名更新到 wrangler.toml 的 R2_PUBLIC_URL
```

### 3. 更新 `wrangler.toml`

```toml
[[d1_databases]]
binding = "D1_DATABASE"
database_name = "PETALGEN_DB"
database_id = "YOUR_D1_ID_HERE"

[[r2_buckets]]
binding = "R2_IMAGES"
bucket_name = "petalgen-images"

[vars]
R2_PUBLIC_URL = "https://your-r2-domain.example.com"
```

### 4. 执行数据库迁移

```bash
npx wrangler d1 execute PETALGEN_DB --remote --file=migrations/001_saved_images.sql
npx wrangler d1 execute PETALGEN_DB --remote --file=migrations/002_seed_tokens.sql
npx wrangler d1 execute PETALGEN_DB --remote --file=migrations/003_enabled_models.sql
npx wrangler d1 execute PETALGEN_DB --remote --file=migrations/004_text_models.sql
```

迁移 003 预置 21 个图像模型（默认启用 4 个：Z-Image Turbo、Flux、Nano Banana Pro、Grok Imagine）。迁移 004 预置 14 个文本模型（启用 Llama Scout——用于提示词重构）。部署后可通过管理面板启用更多模型。

### 5. 设置密钥

```bash
# 你的 Pollinations 运营密钥（服务端用 sk_ 是正确的）
npx wrangler secret put POLLINATIONS_API_KEY

# 管理面板密码——保护 /admin 路由
npx wrangler secret put ADMIN_SECRET
```

也可在 Cloudflare 控制台设置：**Workers & Pages → 你的 Worker → Settings → Variables and Secrets**。

### 6. 构建并部署

```bash
npm run build
npx wrangler deploy
```

### 7. 通过管理面板配置模型

访问你部署的 URL 下的 `/admin`，使用 `ADMIN_SECRET` 登录。

- **Models 标签**：切换图像和文本模型的可用状态。点击 **↺ Sync from Pollinations** 拉取最新模型列表。
- **Library 标签**：查看和删除已保存的图像（同时从 D1 和 R2 中删除）。
- **Rate Limits 标签**：查看活跃的速率限制，可清除单个 IP。

启用模型后，工作区和工厂的模型选择器将立即更新（缓存 5 分钟）。

---

## 本地开发

```bash
# 复制并填写密钥
cp .dev.vars.example .dev.vars

# 构建并以完整 Workers 运行时运行
npm run build
npm run pages:dev
```

> 本地开发使用独立的 D1 实例，图库和 Token 工厂初始为空。端到端功能建议在已部署的 URL 上测试。

---

## 技术栈

| 层级 | 技术 |
|---|---|
| 框架 | Astro v6（SSR + 静态混合） |
| 运行时 | Cloudflare Workers |
| 数据库 | Cloudflare D1（SQLite）——提示词日志、Token、图库、模型注册表 |
| 存储 | Cloudflare R2——生成的图像 |
| 语言 | TypeScript |
| AI 后端 | Pollinations.ai——图像生成 + LLM 提示词重构 |
| 样式 | Flat Warm Pixel 主题——IBM Plex Mono / Inter / Press Start 2P |

---

## 贡献

参见 [CONTRIBUTING.md](CONTRIBUTING.md)。MIT 许可——欢迎 Fork。

---

## 致谢

基于 [Pollinations.ai](https://pollinations.ai) 构建——免费开放的 AI 生成基础设施。
提示词重构由 Llama Scout（Pollinations 文本 API）驱动。
