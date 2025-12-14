# wise-will Edu Agent Platform

An Agent-driven educational visualization platform that helps students understand complex concepts through conversational interaction and automatically generates interactive visualizations.

## Features

- **Conversational Learning** - Enter a topic you want to learn, and AI responds with guided teaching
- **Concept Map Navigation** - Visualize knowledge structures, click nodes to explore related concepts
- **Real-time Visualization Generation** - AI automatically generates interactive HTML visualizations
- **Cloud Deployment** - Automatically deploy to cloud via EdgeOne Pages MCP
- **Progress Tracking** - Real-time display of AI processing stages (Thinking → Writing → Tool Calling → Deploying)

## Quick Start

### Requirements

- Node.js >= 18
- Python >= 3.13
- pnpm

### Installation

```bash
# Clone repository
git clone --recursive https://github.com/your-username/edu-ai-platform.git
cd edu-ai-platform

# Frontend dependencies
cd frontend && pnpm install

# Backend dependencies
cd ../backend && uv sync
```

### Configuration

Copy the environment variable template and fill in your API Key:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```bash
# Using Kimi (default)
KIMI_API_KEY=sk-your-api-key
KIMI_MODEL_NAME=kimi-k2-turbo-preview

# Or use DeepSeek / OpenAI compatible API
LLM_PROVIDER_TYPE=openai_legacy
OPENAI_API_KEY=sk-your-api-key
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_MODEL_NAME=deepseek-chat
OPENAI_REASONING_KEY=reasoning_content
```

### Start

```bash
# Terminal 1 - Backend
cd backend && python main.py

# Terminal 2 - Frontend
cd frontend && pnpm dev
```

Visit http://localhost:3000

## Project Structure

```
edu-ai-platform/
├── frontend/           # Next.js frontend
│   └── src/
│       ├── app/        # Pages
│       ├── components/ # Components
│       └── hooks/      # WebSocket, state management
├── backend/            # FastAPI backend
│   ├── main.py         # Main application
│   ├── kimi_runner.py  # Kimi CLI wrapper
│   ├── mcp.json        # MCP configuration
│   └── agent/          # Agent config and prompts
├── kimi-cli/           # AI Agent core (submodule)
└── kosong/             # LLM abstraction layer (submodule)
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | FastAPI, Python 3.13, WebSocket |
| AI | Kimi CLI, MCP (Model Context Protocol) |
| Deployment | EdgeOne Pages |

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Service status |
| GET | `/health` | Health check |
| GET | `/api/history` | Get history |
| DELETE | `/api/history/{task_id}` | Delete history |
| WebSocket | `/ws/chat` | Real-time chat |

## Acknowledgements

This project is built upon the following excellent  projects:

- **[Kimi CLI](https://github.com/MoonshotAI/kimi-cli)** - Moonshot AI's open-source coding Agent framework, providing tool calling, MCP integration and other core capabilities
- **[Kosong](https://github.com/MoonshotAI/kosong)** - Moonshot AI's open-source LLM abstraction layer, unifying message structures and multi-provider support for more flexible Agent development
- **[EdgeOne Pages MCP](https://github.com/TencentEdgeOne/edgeone-pages-mcp)** - MCP service for EdgeOne Pages, providing one-click cloud deployment capability

Thanks to the Moonshot AI team and EdgeOne Pages community for their open-source contributions!

## Contact

For questions or suggestions, please contact: 3038880699@qq.com



