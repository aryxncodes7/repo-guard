# RepoGuard

RepoGuard is a security-first multi-agent AI dashboard designed to analyze, audit, and provide remediation guidance for GitHub repositories.

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
