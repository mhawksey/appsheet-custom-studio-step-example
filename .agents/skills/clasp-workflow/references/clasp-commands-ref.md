# Clasp CLI Commands Quick Reference

A handy reference of commands provided by `@google/clasp` (v3+).

---

## Authentication & Project Setup

| Command | Description | Example |
| :--- | :--- | :--- |
| `clasp login` | Authenticate with your Google account in browser | `clasp login` |
| `clasp login --no-localhost` | Authenticate on remote/headless machine (copy-paste token) | `clasp login --no-localhost` |
| `clasp logout` | Revoke cached authentication tokens | `clasp logout` |
| `clasp clone <scriptId>` | Clone an existing remote Apps Script project | `clasp clone "1jVuAYj-..."` |
| `clasp create [options]` | Create a new Google Apps Script project | `clasp create --title "My Step"` |
| `clasp status` | Show which local files are tracked vs. ignored by clasp | `clasp status` |
| `clasp open` | Open the current script project in the web browser | `clasp open` |

---

## Synchronization

| Command | Description | Example |
| :--- | :--- | :--- |
| `clasp push` | Push local `.js`, `.html`, and `appsscript.json` to remote project | `clasp push` |
| `clasp push --force` | Overwrite remote project even if remote changes exist | `clasp push -f` |
| `clasp push --watch` | Continuously watch local folder and push on file changes | `clasp push --watch` |
| `clasp pull` | Pull files from remote Apps Script project into local folder | `clasp pull` |

---

## Versions & Deployments

| Command | Description | Example |
| :--- | :--- | :--- |
| `clasp version [description]` | Create an immutable version snapshot | `clasp version "v1.2.0"` |
| `clasp versions` | List all existing version numbers and descriptions | `clasp versions` |
| `clasp deploy [options]` | Deploy a project version as a deployment | `clasp deploy -d "Prod"` |
| `clasp deploy -i <depId> -v <ver>` | Update an existing deployment to point to a new version | `clasp deploy -i "AKfycb..." -v 3` |
| `clasp deployments` | List all active deployments and their IDs | `clasp deployments` |
| `clasp undeploy <depId>` | Delete / deactivate an existing deployment | `clasp undeploy "AKfycb..."` |

---

## Logs & Execution

| Command | Description | Example |
| :--- | :--- | :--- |
| `clasp logs` | Stream recent Stackdriver / Cloud Logging output | `clasp logs` |
| `clasp logs --watch` | Continuously tail logs in terminal | `clasp logs --watch` |
| `clasp run <functionName>` | Run a function remotely via Google Apps Script API | `clasp run testAppSheet` |
