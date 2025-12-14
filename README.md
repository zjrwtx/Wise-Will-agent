# wise-will Edu agent Platform

Agent 驱动的教育可视化平台，通过对话式交互帮助学生理解复杂概念，自动生成交互式可视化内容。

## 功能特点

- **对话式学习** - 输入想学习的知识点，AI 以引导式教学方式回应
- **概念地图导航** - 可视化知识结构，点击节点探索相关概念
- **实时可视化生成** - AI 自动生成交互式 HTML 可视化内容
- **云端部署** - 通过 EdgeOne Pages MCP 自动部署到云端
- **进度追踪** - 实时显示 AI 处理阶段（思考 → 编写 → 调用工具 → 部署）

## 快速开始

### 环境要求

- Node.js >= 18
- Python >= 3.13
- pnpm

### 安装

```bash
# 克隆仓库
git clone --recursive https://github.com/your-username/edu-ai-platform.git
cd edu-ai-platform

# 前端依赖
cd frontend && pnpm install

# 后端依赖
cd ../backend && uv sync
```

### 配置

复制环境变量模板并填入 API Key：

```bash
cp backend/.env.example backend/.env
```

编辑 `backend/.env`：

```bash
# 使用 Kimi（默认）
KIMI_API_KEY=sk-your-api-key
KIMI_MODEL_NAME=kimi-k2-turbo-preview

# 或使用 DeepSeek / OpenAI 兼容 API
LLM_PROVIDER_TYPE=openai_legacy
OPENAI_API_KEY=sk-your-api-key
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_MODEL_NAME=deepseek-chat
OPENAI_REASONING_KEY=reasoning_content
```

### 启动

```bash
# 终端 1 - 后端
cd backend && python main.py

# 终端 2 - 前端
cd frontend && pnpm dev
```

访问 http://localhost:3000

## 项目结构

```
edu-ai-platform/
├── frontend/           # Next.js 前端
│   └── src/
│       ├── app/        # 页面
│       ├── components/ # 组件
│       └── hooks/      # WebSocket、状态管理
├── backend/            # FastAPI 后端
│   ├── main.py         # 主应用
│   ├── kimi_runner.py  # Kimi CLI 封装
│   ├── mcp.json        # MCP 配置
│   └── agent/          # Agent 配置和提示词
├── kimi-cli/           # AI Agent 核心 (submodule)
└── kosong/             # LLM 抽象层 (submodule)
```

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| 后端 | FastAPI, Python 3.13, WebSocket |
| AI | Kimi CLI, MCP (Model Context Protocol) |
| 部署 | EdgeOne Pages |

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 服务状态 |
| GET | `/health` | 健康检查 |
| GET | `/api/history` | 获取历史 |
| DELETE | `/api/history/{task_id}` | 删除历史 |
| WebSocket | `/ws/chat` | 实时聊天 |


## 致谢

本项目基于以下优秀项目构建：

- **[Kimi CLI](https://github.com/MoonshotAI/kimi-cli)** - Moonshot AI 开源的 coding Agent 框架，提供工具调用、MCP 集成等核心能力
- **[Kosong](https://github.com/MoonshotAI/kosong)** - Moonshot AI 开源的 LLM 抽象层，统一消息结构与多 Provider 支持，让 Agent 开发更简洁灵活
- **[EdgeOne Pages MCP](https://github.com/TencentEdgeOne/edgeone-pages-mcp)** - EdgeOne Pages 的 MCP 服务，提供一键云端部署能力

感谢 Moonshot AI 团队和 EdgeOne Pages！

## 联系方式

如有问题或建议，请联系：3038880699@qq.com

## License

