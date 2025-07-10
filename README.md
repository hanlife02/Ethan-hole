# Ethan Hole

一个支持双重认证（API Key + Casdoor）的树洞社区系统，使用 Next.js 构建。

## 功能特性

- 🔐 **双重认证系统**：支持 API Key 和 Casdoor 统一认证
- 🌐 **现代化界面**：基于 Tailwind CSS 的响应式设计
- 🔍 **搜索功能**：支持 PID 搜索和关键词搜索
- 🔥 **热点排序**：多种热度筛选和排序方式
- 📱 **移动友好**：支持下拉刷新等移动端操作
- 🌙 **主题切换**：支持明暗主题切换

## 认证系统

### 用户认证方式

1. **Casdoor 统一认证**（推荐）

   - 普通用户通过 Casdoor 系统登录
   - 支持单点登录（SSO）
   - 用户信息由 Casdoor 管理

2. **管理员直接登录**

   - 使用 API Key 直接登录
   - 仅限管理员使用
   - 绕过 Casdoor 认证

3. **双重认证**（最高安全级别）
   - 同时需要 API Key 和 Casdoor Token
   - 适用于高权限操作

## 环境变量配置

创建 `.env.local` 文件并配置以下环境变量：

### 基础配置

```bash
# 服务端口
PORT=5632

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
DB_SSL=false

# API 访问密钥
ACCESS_KEY=your_access_key
```

### Casdoor 配置

```bash
# Casdoor 服务端点
CASDOOR_ENDPOINT=https://your-casdoor-domain.com

# Casdoor 客户端 ID
CASDOOR_CLIENT_ID=your_casdoor_client_id

# Casdoor 客户端密钥
CASDOOR_CLIENT_SECRET=your_casdoor_client_secret

# 应用名称
CASDOOR_APP_NAME=ethan-hole

# 组织名称（如果包含空格，需要用引号包围）
CASDOOR_ORGANIZATION_NAME="Ethan Club"

# 可选：JWT 公钥（用于本地验证）
# CASDOOR_JWT_PUBLIC_KEY=your_jwt_public_key
```

> **注意**：如果环境变量值包含空格，需要使用双引号包围。例如：
>
> - ✅ 正确：`CASDOOR_ORGANIZATION_NAME="Ethan Club"`
> - ❌ 错误：`CASDOOR_ORGANIZATION_NAME=Ethan Club`

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 环境变量检查

```bash
node scripts/check-env.js
```

### 3. 启动开发服务器

```bash
pnpm dev
```

访问 `http://localhost:5632` 查看应用。

### 4. 生产环境部署

```bash
pnpm build
pnpm start
```

## Casdoor 配置指南

### 1. 在 Casdoor 中创建应用

1. 登录 Casdoor 管理后台
2. 创建新的应用程序
3. 配置以下信息：
   - **应用名称**：`ethan-hole`
   - **回调 URL**：`https://your-domain.com/callback`
   - **组织**：选择或创建组织

### 2. 获取必要信息

- **Endpoint**：Casdoor 服务器地址
- **Client ID**：应用的客户端 ID
- **Client Secret**：应用的客户端密钥
- **Organization Name**：组织名称（如：`Ethan Club`）

### 3. 配置权限

确保用户具有访问应用的权限，可以在 Casdoor 中配置用户角色和权限。

## 双重认证系统

本应用采用双重认证系统，所有用户都必须同时通过以下两种认证：

1. **Casdoor 统一认证**：验证用户身份
2. **API Key 认证**：验证访问权限

### 受保护的 API 端点

所有敏感的 API 端点都需要双重认证：

- `/api/holes/latest` - 获取最新树洞
- `/api/holes/hot` - 获取热点树洞
- `/api/holes/search` - 搜索树洞
- `/api/holes/[pid]` - 获取特定树洞
- `/api/stats` - 获取统计信息

## 开发指南

### 项目结构

```
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   │   ├── auth/          # 认证相关 API
│   │   └── holes/         # 树洞相关 API
│   ├── login/             # 登录页面
│   ├── callback/          # Casdoor 回调页面
│   └── page.tsx           # 主页面
├── components/            # React 组件
├── lib/                   # 工具函数
│   ├── auth-middleware.ts # 认证中间件
│   ├── casdoor.ts        # Casdoor 配置
│   ├── api-client.ts     # API 客户端
│   └── db.ts             # 数据库连接
└── scripts/              # 脚本文件
    └── check-env.js      # 环境变量检查
```

### 双重认证流程

1. **第一步：Casdoor 认证**：

   - 用户访问 `/login` 页面
   - 点击 "Casdoor 登录" 按钮
   - 重定向到 Casdoor 认证页面完成身份验证

2. **认证回调处理**：

   - Casdoor 完成认证后重定向到 `/callback`
   - 系统处理认证结果并保存 Casdoor token
   - 自动跳转回登录页面进行第二步认证

3. **第二步：API Key 认证**：

   - 在登录页面输入 API Key
   - 系统验证 Casdoor token 和 API Key
   - 双重认证通过后跳转到主页面

4. **API 访问**：
   - 前端自动在请求中携带双重认证信息
   - 后端验证 API Key + Casdoor Token 双重认证
   - 只有通过双重认证的请求才能访问受保护的 API

### 添加新的受保护端点

所有新的 API 端点都必须使用双重认证。添加步骤：

1. 导入认证中间件：

```typescript
import { verifyDualAuth, createAuthResponse } from "@/lib/auth-middleware";
```

2. 在路由处理函数开始时添加双重认证检查：

```typescript
export async function GET(request: NextRequest) {
  // 验证双重认证（API Key + Casdoor Token）
  const authResult = await verifyDualAuth(request);
  if (!authResult.success) {
    return createAuthResponse(authResult);
  }

  // 认证通过，执行业务逻辑
  // authResult.user 包含用户信息
}
```

> **注意**：`verifyDualAuth` 函数会同时验证 API Key 和 Casdoor Token，缺少任何一个都会认证失败。

## 故障排除

### 常见问题

1. **Casdoor 连接失败**

   - 检查 `CASDOOR_ENDPOINT` 是否正确
   - 确认网络连接正常
   - 检查 Casdoor 服务是否运行

2. **认证失败**

   - 确认 `CASDOOR_CLIENT_ID` 正确
   - 检查应用在 Casdoor 中的配置
   - 查看浏览器控制台错误信息

3. **数据库连接失败**
   - 运行 `node scripts/check-env.js` 检查配置
   - 确认数据库服务正在运行
   - 检查数据库连接参数

### 日志查看

开发环境下，认证相关的日志会输出到控制台。生产环境建议配置适当的日志系统。

## 技术栈

- **前端**：Next.js 14、React 18、Tailwind CSS
- **后端**：Next.js API Routes
- **数据库**：PostgreSQL
- **认证**：Casdoor
- **UI 组件**：Radix UI
- **图标**：Lucide React

## 贡献指南

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送到分支：`git push origin feature/amazing-feature`
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证。
