# 🛡️ RepoGuard: AI-Powered Repository Security Companion

RepoGuard is a state-of-the-art multi-agent repository auditor and security companion designed to scan source code repositories and Pull Requests. It automatically identifies security vulnerabilities, exposes leaked secrets or API credentials, evaluates logic bugs, inspects code styles, and generates documentation verdicts. It also features a conversational AI companion to assist developers in reviewing findings and implementing immediate mitigations.

---

## ✨ Features

- **🔍 Comprehensive Security Audits**: Performs full-scope security reviews on actual repository files to spot leaked credentials, logic bugs, and structural flaws.
- **🤖 Multi-Agent Analysis Pipeline**:
  - **Triage Agent**: Analyzes the size, scope, and initial risk metrics of the codebase.
  - **Code Review Agent**: Scans line-by-line for memory leaks, logic bugs, style violations, and exposed secrets.
  - **Docs Agent**: Checks README compliance, inline code comments, and outdated documentation segments.
  - **Synthesizer Agent**: Compiles individual agent reports into a unified markdown summary.
- **💬 AI Chatbot Companion**: An interactive sidebar assistant that lets you query the codebase, ask about specific vulnerabilities, and receive step-by-step remediation advice.
- **⚙️ Configurable Audit Depth**: Toggle between **Rapid Threat Check** (Concise), **Full Scope Engine** (Standard), and **Cryptographic Trace** (Deep) to suit your speed and coverage needs.
- **🔐 Secure API Key Sandbox**: Input your own Gemini API key or GitHub Personal Access Token (PAT) inside a secure client sandbox, which is saved locally in your browser.
- **🎨 Premium Responsive UI**: Translucent glassmorphism header, smooth hardware-accelerated logo animations, dark/light theme alignment, and beautiful dashboard elements.

---

## 🛠️ Architecture Overview

RepoGuard is built as a single-page application (SPA) backed by a secure proxy server to negotiate Gemini and GitHub MCP interactions without exposing secrets:

```
┌────────────────────────────────────────────────────────┐
│                      Web Client                        │
│ (React + Tailwind CSS + Lucide Icons + Framer Motion) │
└──────────────────────────┬─────────────────────────────┘
                           │ POST /api/review or /api/chat
                           ▼
┌────────────────────────────────────────────────────────┐
│                    Express Proxy                       │
│    (Node.js + tsx server + dynamic Gemini Clients)     │
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
├── src/
│   ├── components/
│   │   ├── AgentStepper.tsx        # Multi-agent visual progression stepper
│   │   ├── ChatbotCompanion.tsx    # Sidebar AI chat assistant interface
│   │   ├── MarkdownLite.tsx        # Optimized lightweight markdown renderer
│   │   └── ReportView.tsx          # Detailed audit reports and code patch diff views
│   ├── types.ts                    # TypeScript interfaces (ReviewResponse, CodeIssue, etc.)
│   ├── App.tsx                     # Core workspace application page and splash screen
│   ├── main.tsx                    # React client mounting entrypoint
│   └── index.css                   # Tailwind theme guidelines and baseline styling
├── server.ts                       # Secure Express proxy negotiating Gemini/GitHub APIs
├── index.html                      # HTML SPA client entrypoint
├── package.json                    # Workspace dependencies, build, and start script hooks
├── tsconfig.json                   # Client and server TypeScript compilation config
└── vite.config.ts                  # Vite client dev server and asset bundler rules
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed (v18 or higher recommended).

### 🛠️ Environment Setup Guide

To configure the application locally:
1. Clone the repository and install the dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file in the root directory (you can copy `.env.example` as a baseline).

---

## ⚙️ API Configuration Requirements

The application requires specific environment variables to interact with backend APIs and run client audits safely:

```env
# Your primary Gemini API credentials (fallback if not supplied in UI)
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: GitHub token to scan private repositories and prevent API rate-limiting
GITHUB_TOKEN=your_github_personal_access_token

# Allowed domains for email links to prevent phishing/XSS
VITE_ALLOWED_EMAIL_DOMAINS=github.com,gmail.com,outlook.com,hotmail.com,yahoo.com,protonmail.com,proton.me,google.com
```

### Running Locally
Start the development server:
```bash
npm run dev
```
The application will launch on `http://localhost:3000`.

### Production Build
To bundle the client files and package the server code:
```bash
npm run build
```
To run the production build:
```bash
npm run start
```

---

## 🛡️ Security Model Definitions

RepoGuard enforces a multi-layer security model to protect developers and backend systems:

### 1. Threat Scenarios & Remediation
- **Credential Leak Detection**: Identifies plain-text API keys, tokens, and certificates within the codebase. Remediated by prompting users to clean branch history before merging.
- **Prompt Injection Defense**: Cleans user context and dynamic fields (`repoUrl`, issues list) by stripping brackets, quotes, and HTML tag indicators to prevent model instruction overrides.
- **XSS & Injection Protection**: HTML sanitization is applied during string clamping (`clampText`), and URL sanitization blocks path-traversal sequences and relative paths.

### 2. Scheme & Link Filtering Allowlists
- **Dynamic Email Domain Validation**: Standardizes `mailto:` parsing by dropping all query parameters and checking domains against a strict allowlist loaded from the `VITE_ALLOWED_EMAIL_DOMAINS` environment variable.
- **Protocol Allowlist**: Only `http:`, `https:`, and valid `mailto:` protocols are allowed. `javascript:`, `data:`, and Windows backslash paths are completely blocked.

---

## 🔒 Security Best Practices

> [!IMPORTANT]
> RepoGuard handles sensitive codebase scans. For public deployments:
> - Do not commit your `.env` files. Ensure they are listed in your `.gitignore`.
> - If deploying to cloud platforms, store `GEMINI_API_KEY` and `GITHUB_TOKEN` as secure system environment variables.

---

## 👥 Authors & Contributors

- **Aryan Raj** - Creator ([GitHub Profile](https://github.com/aryxncodes7))
