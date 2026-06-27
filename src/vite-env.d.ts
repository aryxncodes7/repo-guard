/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Allowed domains for email links to prevent phishing/XSS
   * e.g. "github.com,gmail.com,outlook.com,hotmail.com,yahoo.com,protonmail.com,proton.me,google.com"
   */
  readonly VITE_ALLOWED_EMAIL_DOMAINS: `${string}.${string}`;
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
