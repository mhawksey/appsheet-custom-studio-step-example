# Claspignore Patterns & Best Practices

The `.claspignore` file works similarly to `.gitignore`. It controls which local files are excluded when running `clasp push`.

---

## Why `.claspignore` is Critical

In Apps Script:
1. Every file uploaded becomes a script file in the online project.
2. Apps Script enforces a project file count and size limit.
3. Uploading non-script files (markdown, test configs, npm dependencies) causes clutter, build errors, and quota exhaustion.
4. Uploading secret keys (such as `ApplicationAccessKey` in `.env.js` or `Tests.js`) exposes credentials to all collaborators with read access to the Apps Script project.

---

## Recommended `.claspignore`

```gitignore
# 1. Environment & Local Credentials
# NOTE: .env.js is NOT included here! In Google Apps Script development,
# .env.js provides the global CONFIG needed by Tests.js in the online editor.
# .env.js is gitignored to protect GitHub, but pushed by Clasp.
.env_ex.js
.clasp.json

# 2. Git & GitHub Metadata
.git/**
.github/**

# 3. Agent Skills, Rules & Instructions
.agents/**
.gemini/**

# 4. Project Documentation
docs/**
*.md

# 5. Node / Package Manager Dependencies
node_modules/**
package.json
package-lock.json
```

---

## The `.env.js` Rule: Git vs. Clasp

- **`.gitignore`**: Excludes `.env.js` from Git commits and pushes so secrets never reach GitHub.
- **`.claspignore`**: MUST NOT exclude `.env.js`. Clasp pushes `.env.js` to your private Apps Script project so that `CONFIG` is available when executing test functions (`testAppSheetConnection`, `runAllDynamicWidgetTests`).
- Only the example template (`.env_ex.js`) belongs in `.claspignore`.

---

## Verification

Always verify your ignore rules using:
```bash
clasp status
```

Verify that under **Tracked files**, you see:
- `src/.env.js` (provides `CONFIG` credentials for online tests)
- `src/appsscript.json`
- `src/Code.js`
- `src/AppSheetApp.js`
- `src/Tests.js`
