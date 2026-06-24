# 🛡️ RepoGuard — AI-Powered Repository Security Companion

RepoGuard is a multi-agent repository auditor and security companion that scans GitHub repositories and Pull Requests. It automatically identifies security vulnerabilities, exposes leaked secrets or API credentials, evaluates logic bugs, inspects code styles, and generates documentation verdicts — all powered by Google's Gemini AI models with intelligent fallback across model tiers.

## Setup
Ensure `VITE_ALLOWED_EMAIL_DOMAINS` is set in your `.env` file.

## API Configuration
The chatbot requires a running backend instance at `/api/chat`. See `src/components/ChatbotCompanion.tsx` for integration details.

---

## ✨ Features

- **🔍 Comprehensive Security Audits** — Full-scope security reviews on actual repository source files to spot leaked credentials, logic bugs, and structural flaws.
- **🤖 Multi-Agent Analysis Pipeline**:
  - **Triage Agent** — Analyzes the size, scope, and initial risk metrics of the codebase.
  - **Code Review Agent** — Scans line-by-line for memory leaks, logic bugs, style violations, and exposed secrets.
  - **Docs Agent** — Checks README compliance, inline code comments, and outdated documentation segments.
  - **Synthesizer Agent** — Compiles individual agent reports into a unified markdown summary with priority fixes.
- **💬 AI Chatbot Companion** — An interactive sidebar assistant where you can query about vulnerabilities, ask for remediation steps, and learn secure coding practices.
- **⚙️ Configurable Audit Depth** — Toggle between **Rapid Threat Check** (Concise), **Full Scope Engine** (Standard), and **Cryptographic Trace** (Deep) scan modes.
- **🔐 Secure API Key Sandbox** — Input your own Gemini API key or GitHub Personal Access Token (PAT) in a client-side settings panel, saved locally in your browser.
- **🎨 Premium Responsive UI** — Glassmorphism header, smooth hardware-accelerated logo animations, dark/light theme, and a polished dashboard built with Tailwind CSS v4 and Framer Motion.
- **🧪 Tested Utilities** — Core input sanitization and URL parsing functions are covered by automated unit tests.

---

## 🛠️ Architecture Overview

RepoGuard is built as a single-page application (SPA) backed by a secure Express proxy server that negotiates Gemini AI and GitHub API interactions without exposing secrets. The backend supports both local development (via Vite middleware) and Vercel serverless deployment.

```
┌────────────────────────────────────────────────────────┐
│                      Web Client                        │
│ (React + Tailwind CSS v4 + Lucide Icons + Motion)      │
└──────────────────────────┬─────────────────────────────┘
                           │ POST /api/review or /api/chat
                           ▼
┌────────────────────────────────────────────────────────┐
│              Express API (server.ts)                   │
│   Local: Vite dev middleware  │  Vercel: Serverless    │
│   (tsx server.ts)             │  (api/index.ts)        │
└──────────────────────────┬─────────────────────────────┘
                           │ Scans & API Calls
                           ▼
             ┌─────────────┴─────────────┐
             ▼                           ▼
 ┌───────────────────────┐   ┌───────────────────────┐
 │      GitHub API       │   │      Gemini API       │
 │ (Fetch repo tree/PRs) │   │ (Multi-agent reviews) │
 └───────────────────────┘   └───────────────────────┘
```

---

## 📁 Project File Structure

```
repoguard/
├── api/
│   └── index.ts                    # Vercel serverless function entry point
├── src/
│   ├── components/
│   │   ├── AgentStepper.tsx        # Multi-agent visual progression stepper
│   │   ├── ChatbotCompanion.tsx    # Sidebar AI chat assistant interface
│   │   ├── MarkdownLite.tsx        # Lightweight markdown renderer
│   │   └── ReportView.tsx          # Detailed audit reports and code patch diff views
│   ├── types.ts                    # TypeScript interfaces (ReviewResponse, CodeIssue, etc.)
│   ├── utils.ts                    # Input sanitization, URL parsing, and security helpers
│   ├── utils.test.ts               # Unit tests for utility functions
│   ├── App.tsx                     # Core workspace page, splash screen, and settings modal
│   ├── main.tsx                    # React client mounting entry point
│   └── index.css                   # Tailwind v4 theme and baseline styling
├── server.ts                       # Express proxy server (Gemini + GitHub API integration)
├── vercel.json                     # Vercel deployment config (rewrites, build settings)
├── index.html                      # HTML SPA client entry point
├── package.json                    # Dependencies, build, dev, test, and start scripts
├── tsconfig.json                   # TypeScript compilation config
├── vite.config.ts                  # Vite client dev server and asset bundler config
├── .env.example                    # Template for required environment variables
└── .gitignore                      # Ignores node_modules, dist, .env files, and logs
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher

### Installation

```bash
git clone https://github.com/aryxncodes7/repo-guard.git
cd repo-guard
npm install
```

### Environment Variables Configuration

Create a `.env` file in the root directory (you can copy `.env.example` as a baseline):

```bash
cp .env.example .env
```

Then fill in the required values:

```env
# Required — Gemini API key for AI-powered reviews
GEMINI_API_KEY=your_gemini_api_key_here

# Optional — GitHub PAT to access private repos and avoid rate limits
GITHUB_TOKEN=your_github_personal_access_token

# Optional — Comma separated list of allowed email domains for markdown links
VITE_ALLOWED_EMAIL_DOMAINS=gmail.com,yahoo.com,outlook.com,hotmail.com

### Domain Access Restrictions

The allowed email domains for markdown link sanitation are securely enforced by the `VITE_ALLOWED_EMAIL_DOMAINS` environment variable, falling back to a default allowlist if not provided.

### Running Locally

```bash
npm run dev
```

The app launches on **http://localhost:3000**.

### Production Build

> **Note:** Any variables prefixed with `VITE_` (such as `VITE_ALLOWED_EMAIL_DOMAINS`) must be present in your environment *before* running the build step so Vite can bake them into the client bundle.

```bash
npm run build    # Bundles client (Vite) + server (esbuild)
npm run start    # Starts the production server
```

### Testing

```bash
npm run test     # Runs unit tests for utility functions
npm run lint     # TypeScript type-checking (tsc --noEmit)
```

---

## ☁️ Vercel Deployment

RepoGuard supports deployment to [Vercel](https://vercel.com) out of the box.

### How It Works

- The **frontend** is built with Vite and served as static files from `dist/`.
- The **backend API** (`/api/review`, `/api/chat`) runs as a Vercel Serverless Function via `api/index.ts`, which imports the Express app from `server.ts`.
- `vercel.json` rewrites all `/api/*` requests to the serverless function entry point.

### Setup Steps

1. Push the repo to GitHub and import it in [Vercel Dashboard](https://vercel.com/new).
2. **Add environment variables** in Vercel → Settings → Environment Variables:
   - `GEMINI_API_KEY` *(required)*
   - `GITHUB_TOKEN` *(optional, recommended)*
3. Deploy. Vercel will auto-detect the Vite framework and run `npm run build`.

> [!IMPORTANT]
> Your `.env` file is gitignored and will NOT be available on Vercel. You **must** add `GEMINI_API_KEY` in the Vercel dashboard, otherwise scans will fail.

---

## 🛡️ Security Model

RepoGuard enforces a multi-layer security model to protect developers and backend systems:

### Threat Scenarios & Remediation
- **Credential Leak Detection** — Identifies plain-text API keys, tokens, and certificates within the codebase. Remediated by prompting users to clean branch history before merging.
- **Prompt Injection Defense** — Cleans user context and dynamic fields by stripping brackets, quotes, and HTML tag indicators to prevent model instruction overrides.
- **XSS & Injection Protection** — Markdown strings are safely compiled through a sanitized `DOMPurify` pipeline. A strict `Content-Security-Policy` header explicitly bans inline `eval()` executions or unauthorized script insertions to completely neutralize browser-side vulnerabilities.

### Scheme & Link Filtering Allowlists
- **Dynamic Email Domain Validation** — Standardizes `mailto:` parsing by dropping all query parameters and checking domains against a strict global allowlist defined in `src/utils.ts`.
- **Protocol Allowlist** — Only `http:`, `https:`, and valid `mailto:` protocols are allowed. `javascript:`, `data:`, and Windows backslash paths are completely blocked.

---

## 🔒 Security Best Practices

> [!IMPORTANT]
> RepoGuard handles sensitive codebase scans. For public deployments:
> - Do not commit your `.env` files. Ensure they are listed in your `.gitignore`.
> - If deploying to cloud platforms, store `GEMINI_API_KEY` and `GITHUB_TOKEN` as secure system environment variables.
> - API keys supplied in the browser settings panel are only stored in `localStorage` and never transmitted to any third party.

---

## 👥 Authors & Contributors

- **Aryan Raj** — Creator ([GitHub Profile](https://github.com/aryxncodes7))
