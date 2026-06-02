# ClearPath
### AI-Powered Task Automation Agent

---

## What is ClearPath?

ClearPath is a web application that takes any task described in plain English, breaks it down into a structured execution plan, and delivers a detailed result — all powered by Large Language Models (LLMs).

**Live Demo:** https://clearpath-steel.vercel.app

---

## How It Works

When a user submits a task, the agent runs a 3-phase pipeline:

### Phase 1 — Planning
The LLM receives the user's task and breaks it down into 3-4 logical sub-tasks. Each sub-task has a title and a description of what it produces. This mimics how a human would approach a complex problem — by dividing it into smaller, manageable steps.

### Phase 2 — Execution
The agent executes each sub-task sequentially, showing real-time progress to the user. Each step is marked as waiting → active → done, giving the user visibility into what the agent is doing at each moment.

### Phase 3 — Synthesis
After all sub-tasks are complete, the agent synthesizes a final structured result — a complete, well-formatted answer to the original task.

---

## Modes

ClearPath offers two modes depending on the user's need:

### ⚡ Fast Mode
- Powered by Groq API running LLaMA 3.3 70B
- Extremely fast responses (under 3 seconds)
- Best for quick lookups, simple tasks, and general questions

### 🔍 Detailed Mode
- Powered by OpenRouter with advanced models
- In-depth, thorough responses
- Best for research, complex analysis, and detailed planning
- May take 10-20 seconds longer

---

## Architecture

```
User Input
↓
Mode Selection (Fast / Detailed)
↓
LLM Planner (breaks task into sub-tasks)
↓
Task Executor (runs each sub-task)
↓
Result Synthesizer (combines into final answer)
↓
Markdown Rendered Output to User
```

This pattern is known as the ReAct agent loop (Reason + Act) — a standard architecture in AI agent systems where the model reasons about what to do, acts on it, and evaluates the result.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React.js |
| Styling | CSS3 |
| Fast Mode AI | Groq API (LLaMA 3.3 70B) |
| Detailed Mode AI | OpenRouter API |
| Markdown Rendering | react-markdown |
| Deployment | Vercel |

---

## Project Structure

```
ClearPath-AI-Agent/
├── public/
│   └── index.html
├── src/
│   ├── App.js        # Main agent logic and UI
│   └── App.css       # Styling
├── .env              # API keys (not committed to GitHub)
├── .gitignore
├── package.json
└── README.md
```

---

## How to Run Locally

### Requirements
- Node.js v18+
- A Groq API key (free at https://console.groq.com)
- An OpenRouter API key (free at https://openrouter.ai)

### Steps

**1. Clone the repository**

```bash
git clone https://github.com/yourusername/clearpath.git
cd clearpath
```

**2. Install dependencies**

```bash
npm install
```

**3. Create a .env file in the root folder**

REACT_APP_GROQ_KEY=your_groq_key_here
REACT_APP_OPENROUTER_KEY=your_openrouter_key_here

**4. Start the app**

```bash
npm start
```

The app will open at http://localhost:3000

---

## Example Tasks

- "List the top 5 programming languages to learn in 2025 with reasons"
- "Create a study plan to crack JEE Advanced starting from Class 10"
- "Explain the differences between REST and GraphQL APIs"
- "Write a cold email template for a software engineering internship"
- "Compare React vs Vue vs Angular for a beginner"

---

## Known Limitations

- The LLM has a training data cutoff, so real-time information like live scores or current rankings may not be accurate
- Each task is independent — the agent does not remember previous conversations
- Free tier APIs have rate limits — if the app returns an error, waiting 30 seconds and retrying usually works

---

## What I Learned

- How to integrate multiple third-party LLM APIs into a single React application
- How AI agent pipelines work (plan → execute → synthesize)
- How to handle async operations and show real-time UI updates in React
- How to render markdown responses properly using react-markdown
- How to build a mode-switching system to balance speed vs quality
- How to deploy a React app on Vercel with environment variables
- The ReAct agent architecture pattern used in production AI systems
