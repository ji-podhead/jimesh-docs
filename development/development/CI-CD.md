# JiMesh Continuous Integration & Delivery (CI/CD)

This document describes the automated CI/CD pipeline configured for the JiMesh repository via GitHub Actions.

---

## 🚀 Overview

The CI/CD pipeline runs automatically on every `push` and `pull_request` to the `main` or `dev` branches. It enforces strict quality gates, security scans, and build verifications before code is merged.

---

## 🛠️ Pipeline Jobs

### 1. Secrets & Credentials Scan (`secrets-scan`)
- **Tool:** Gitleaks Action (`gitleaks/gitleaks-action@v2`)
- **Depth:** Scans full commit history and working tree diffs.
- **Goal:** Detect leaked API keys, tokens, passwords, or private key blocks before code enters `main`.

### 2. Go Backend Quality & Tests (`backend-ci`)
- **Environment:** Ubuntu Latest with Go 1.22+ and `protoc`.
- **Steps:**
  1. Dependencies downloaded and cached via `go.sum`.
  2. Static analysis via `go vet ./...`.
  3. Unit and integration tests executed via `go test -v ./...`.

### 3. Frontend Verification & i18n (`frontend-ci`)
- **Environment:** Node.js 20 LTS.
- **Steps:**
  1. Clean dependency installation via `npm ci` in `src/frontend/`.
  2. TypeScript type checking via `tsc --noEmit -p tsconfig.app.json`.
  3. Translation completeness check via `node scripts/check-i18n.mjs`.

---

## 🌐 Documentation Deployment

Documentation is built automatically and published to GitHub Pages on merges to `main` via `.github/workflows/pages.yml`.
