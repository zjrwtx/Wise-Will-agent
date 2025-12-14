````md
# Wise-will Edu Agent Platform

## 📚 Open-Source Educational AI Agent

This is an **open-source educational AI Agent product**.  
Its design is **inspired by excellent products such as Ant Lingguang, Doubao Aixue, and Feixiang Teacher**,  
and it is dedicated to **visually explaining everything you ask**, truly achieving the goal of being **built for education**.

---

### 🎯 Why Education?

We believe that **education is one of the most important real-world application scenarios for AI agents**.  
By choosing **open source**, we hope to:

- 🌱 Support more **schools**
- 👩‍🎓 Empower more **students**
- 👨‍🏫 Assist more **educators**

So that **AI-powered education** is not limited to a few platforms, but can be genuinely adopted and used by more people.

---

### 🚧 Project Status

- The current version is still **relatively rough**
- Features and user experience are **actively being refined**
- The project will **continue to evolve and improve**

---

### 🤝 Collaboration & Contribution

You are welcome to:

- Use it  
- Share feedback  
- Contribute code  

Let’s build better educational AI together 👏

---

> **Enjoy education agent time together 🚀**

---

## Features

- **Conversational Learning** – Enter a topic you want to learn, and the AI responds with guided, instructional dialogue
- **Concept Map Navigation** – Visualized knowledge structures with clickable nodes to explore related concepts
- **Real-time Visualization Generation** – The AI automatically generates interactive HTML visualizations
- **Cloud Deployment** – One-click deployment to the cloud via EdgeOne Pages MCP
- **Progress Tracking** – Real-time display of AI processing stages (Thinking → Writing → Tool Calling → Deployment)

---

## Examples

(See screenshots above)

---

## Quick Start

### Requirements

- Node.js >= 18
- Python >= 3.13
- pnpm

### Installation

```bash
# Clone the repository
git clone --recursive https://github.com/your-username/edu-ai-platform.git
cd edu-ai-platform

# Frontend dependencies
cd frontend && pnpm install

# Backend dependencies
cd ../backend && uv sync
````

### Configuration

Copy the environment variable template and fill in your API key:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```bash
# Use Kimi (default)
KIMI_API_KEY=sk-your-api-key
KIMI_MODEL_NAME=kimi-k2-turbo-preview

# Or use DeepSeek / OpenAI-compatible API
LLM_PROVIDER_TYPE=openai_legacy
OPENAI_API_KEY=sk-your-api-key
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_MODEL_NAME=deepseek-chat
OPENAI_REASONING_KEY=reasoning_content
```

### Run

```bash
# Terminal 1 - Backend
cd backend && python main.py

# Terminal 2 - Frontend
cd frontend && pnpm dev
```

Visit: [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```text
edu-ai-platform/
├── frontend/           # Next.js frontend
│   └── src/
│       ├── app/        # Pages
│       ├── components/ # UI components
│       └── hooks/      # WebSocket & state management
├── backend/            # FastAPI backend
│   ├── main.py         # Main application
│   ├── kimi_runner.py  # Kimi CLI wrapper
│   ├── mcp.json        # MCP configuration
│   └── agent/          # Agent configs and prompts
├── kimi-cli/           # AI Agent core (submodule)
└── kosong/             # LLM abstraction layer (submodule)
```

---

## Tech Stack

| Layer      | Technology                                       |
| ---------- | ------------------------------------------------ |
| Frontend   | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend    | FastAPI, Python 3.13, WebSocket                  |
| AI         | Kimi CLI, MCP (Model Context Protocol)           |
| Deployment | EdgeOne Pages                                    |

---

## API

| Method    | Endpoint                 | Description    |
| --------- | ------------------------ | -------------- |
| GET       | `/`                      | Service status |
| GET       | `/health`                | Health check   |
| GET       | `/api/history`           | Fetch history  |
| DELETE    | `/api/history/{task_id}` | Delete history |
| WebSocket | `/ws/chat`               | Real-time chat |

---

## Acknowledgements

This project is built upon the following excellent open-source projects:

* **[Kimi CLI](https://github.com/MoonshotAI/kimi-cli)** – An open-source coding agent framework by Moonshot AI, providing core capabilities such as tool invocation and MCP integration
* **[Kosong](https://github.com/MoonshotAI/kosong)** – An open-source LLM abstraction layer by Moonshot AI that unifies message structures and supports multiple providers, making agent development simpler and more flexible
* **[EdgeOne Pages MCP](https://github.com/TencentEdgeOne/edgeone-pages-mcp)** – An MCP service for EdgeOne Pages that enables one-click cloud deployment

Special thanks to the Moonshot AI team and EdgeOne Pages!

---

## Contact

For questions or suggestions, please contact: [3038880699@qq.com](mailto:3038880699@qq.com)

---

## License

Apache-2.0
[https://www.apache.org/licenses/LICENSE-2.0](https://www.apache.org/licenses/LICENSE-2.0)

```
```
