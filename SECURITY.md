# Security Policy

## Supported Versions

Only the latest `main` branch is actively supported with security updates.

## Reporting a Vulnerability

Please report any security issues or vulnerabilities by opening a private GitHub security advisory. Do not report security vulnerabilities in public issues.

We will acknowledge your report within 48 hours and work with you to resolve the issue as quickly as possible.

## Project Configuration Guidelines

### Allowed Email Domains (`VITE_ALLOWED_EMAIL_DOMAINS`)

To prevent unauthorized or malicious email domain parsing within `mailto:` links, the application uses a strict allowed list of domains. This must be configured via the `VITE_ALLOWED_EMAIL_DOMAINS` environment variable.

```env
VITE_ALLOWED_EMAIL_DOMAINS=gmail.com,yahoo.com,outlook.com
```

Ensure this list only contains trusted domains. If malformed or not provided, the application will silently drop invalid domains, potentially breaking `mailto:` parsing entirely to ensure strict bounds violation protection.
