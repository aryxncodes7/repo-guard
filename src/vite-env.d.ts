/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ALLOWED_EMAIL_DOMAINS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
