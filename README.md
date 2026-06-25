# RepoGuard

RepoGuard is a premium, security-first multi-agent AI dashboard designed to analyze, audit, and provide remediation guidance for GitHub repositories. Built with Next.js, React, and a stunning Tailwind CSS dark mode interface, it leverages a parallel 4-agent backend pipeline for comprehensive code analysis.

## 🌟 Key Features

- **🔐 Real GitHub OAuth Integration:** Securely connect your GitHub account via a seamless OAuth flow.
- **🗃️ Dynamic Repository Grid:** Authenticated users get a beautiful, state-flipping dashboard that fetches their live GitHub repositories directly via the official GitHub API. Includes search filtering and instant audit execution.
- **🎛️ Repo Health Matrix:** A multi-dimensional scorecard widget that breaks down security, accessibility, test coverage, and code cleanliness into color-coded progress indicators.
- **🤖 Parallel Multi-Agent Pipeline:** Four autonomous AI agents (Triage, Code Review, Docs, and Synthesizer) operate concurrently to provide a full-spectrum security audit.
- **💬 AI Security Companion:** Interactive chatbot interface built to query your custom audit reports seamlessly.

## 🚀 Getting Started

1. **Clone the repo:** `git clone [url]`

2. **Install dependencies:** `npm install`

3. **Configure Environment:**

   Create a `.env` file:
   - `VITE_API_BASE_URL`: Your backend endpoint.
   - `VITE_ALLOWED_EMAIL_DOMAINS`: Comma-separated list of safe email domains.

## 🛡️ Security Model

RepoGuard implements several layers of defense:

- **Input Sanitization:** All URLs are normalized via `normalizeGithubRepoUrl` and `getSafeHref` to prevent SSRF and protocol smuggling.
- **Strict Client State Management:** OAuth tokens and authenticated sessions are handled efficiently with robust disconnect sequences that hard-wipe local persistence layers and sanitize URL histories.
