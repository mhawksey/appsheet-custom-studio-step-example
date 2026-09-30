---
name: clasp-workflow
description: >
  Guide for managing Google Apps Script development, synchronization, versioning, deployment, and testing using
  the @google/clasp CLI and Git. Covers clasp login/push/pull, .claspignore best practices, Workspace Studio test
  deployments, Standard GCP Project linking, OAuth configuration, and CI/CD automation via GitHub Actions.
---

# Google Apps Script Clasp CLI & Developer Workflow

The Command Line Apps Script Projects (`clasp`) tool enables local development of Google Apps Script projects using modern editors (VS Code), Git version control, TypeScript definitions, and automated CI/CD pipelines.

## Core Development Loop

```
┌─────────────────────────┐             clasp push             ┌─────────────────────────┐
│     Local Codebase      │ ─────────────────────────────────> │   Google Apps Script    │
│  - Code.js / AppSheet.js│                                    │   (Online Script IDE)   │
│  - appsscript.json      │ <───────────────────────────────── │                         │
│  - Git Repository       │             clasp pull             │                         │
└─────────────────────────┘                                    └────────────┬────────────┘
             │                                                              │ Deploy
             ▼                                                              ▼
┌─────────────────────────┐                                    ┌─────────────────────────┐
│  GitHub Actions / CI/CD │                                    │ Workspace Studio Flow   │
│  - Push on merge        │                                    │ (Test Deployments)      │
└─────────────────────────┘                                    └─────────────────────────┘
```

---

## 1. Setup & Authentication

### Check Clasp Version
```bash
clasp -v
```

### Log In to Google
Log in with an account that has edit access to the Apps Script project:
```bash
clasp login
```
*Note: This generates credentials stored securely in `~/.clasprc.json`.*

### Verify Project Connection
Check `.clasp.json` to verify the `scriptId`:
```json
{
  "scriptId": "1jVuAYj-1UmujgewYspoDMxMOUoR0C17b5N4QSwMHrlSkAqhnZ3h63Ul6",
  "rootDir": ""
}
```
Run status to view tracked vs untracked files:
```bash
clasp status
```

---

## 2. Synchronization (`push` and `pull`)

### Push Local Code to Apps Script
Pushes all tracked local files to the remote Apps Script project:
```bash
clasp push
```
*Tip: Use `clasp push --watch` during active development to auto-push whenever files are saved.*

### Pull Changes from Remote
If modifications were made directly in the online Apps Script editor:
```bash
clasp pull
```

---

## 3. Deployment Workflow for Workspace Studio

Google Workspace Studio add-ons require a deployment so that Studio can discover and run the custom steps.

### List Existing Deployments
```bash
clasp deployments
```

### Create a Test Deployment in Apps Script
1. Open the project in your browser:
   ```bash
   clasp open
   ```
2. Click **Deploy** > **Test deployments**.
3. Select **Google Workspace Add-on** and click **Install**.
4. The add-on is now installed for your user account and its custom steps appear in Google Workspace Studio (`https://studio.workspace.google.com/`).

### Create Versioned Deployments via CLI
```bash
# 1. Create a version snapshot
clasp version "Release 1.0.0 - AppSheet Steps"

# 2. Deploy the version
clasp deploy --description "Production release v1.0.0"
```

👉 See [references/studio-test-deployment.md](references/studio-test-deployment.md) for detailed test setup.

---

## 4. Protecting Project Boundaries (`.claspignore`)

Without `.claspignore`, clasp will attempt to push all `.js`, `.json`, and `.html` files in any subdirectory (including `.agents/`, `node_modules/`, `package.json`, and markdown files).

Always ensure `.claspignore` excludes non-runtime files (note: `.env.js` is pushed by Clasp for test execution and gitignored in `.gitignore`):
```
.env_ex.js
.clasp.json
.git/**
.github/**
.agents/**
.gemini/**
docs/**
node_modules/**
package.json
package-lock.json
*.md
```

👉 See [references/claspignore-patterns.md](references/claspignore-patterns.md).

---

## 5. Google Cloud Project & Cloud Logging

For enterprise deployments or debugging production flows:
1. Link your Apps Script project to a **Standard Google Cloud Platform (GCP) Project**.
2. Inspect runtime execution logs in real time via **Google Cloud Logging (Stackdriver)**.
3. Configure OAuth consent screen and verified scopes.

👉 See [references/gcp-project-and-logging.md](references/gcp-project-and-logging.md).

---

## Detailed References

- [Clasp Commands Quick Reference (`references/clasp-commands-ref.md`)](references/clasp-commands-ref.md)
- [Claspignore Patterns Guide (`references/claspignore-patterns.md`)](references/claspignore-patterns.md)
- [Workspace Studio Test Deployment Guide (`references/studio-test-deployment.md`)](references/studio-test-deployment.md)
- [GCP Project Linking & Cloud Logging (`references/gcp-project-and-logging.md`)](references/gcp-project-and-logging.md)
- [GitHub Actions CI/CD Deployment Workflow (`examples/github-deploy-action.yml`)](examples/github-deploy-action.yml)
