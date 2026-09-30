# Standard GCP Project & Cloud Logging

By default, Google Apps Script projects run inside a hidden, default Google Cloud project. To unlock enterprise logging, custom OAuth consent, and domain-wide distribution, link your script to a **Standard Google Cloud Platform (GCP) Project**.

---

## 1. Linking a Standard GCP Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new GCP project (or select an existing project for your organization). Note the **Project Number** (e.g. `123456789012`).
3. Enable the **Google Workspace Marketplace SDK** if you plan to publish org-wide.
4. In your Apps Script editor:
   - Click **Project Settings** (gear icon on the left menu).
   - Under **Google Cloud Platform (GCP) Project**, click **Change project**.
   - Paste your GCP **Project Number** and click **Set project**.

---

## 2. Real-Time Cloud Logging (Stackdriver)

With a Standard GCP Project linked and `"exceptionLogging": "STACKDRIVER"` in `appsscript.json`:
- All `console.log()`, `console.info()`, `console.warn()`, and `console.error()` calls stream directly to Google Cloud Logging.
- Stack traces for unhandled runtime exceptions are automatically recorded.

### Viewing Logs in Cloud Console
1. Navigate to **Google Cloud Console** > **Logging** > **Logs Explorer**.
2. Query by resource:
   ```
   resource.type="app_script_function"
   ```
3. Or filter specifically for your custom step execution:
   ```
   jsonPayload.message =~ "onExecuteAddRows"
   ```

### Streaming Logs via Clasp CLI
Stream the most recent log entries directly in your local terminal:
```bash
clasp logs --watch
```

---

## 3. OAuth Scopes Management

Explicitly declare scopes in `appsscript.json` to prevent over-permissioning:

```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/userinfo.email"
  ]
}
```

- `https://www.googleapis.com/auth/script.external_request`: Required for `UrlFetchApp` calls to AppSheet API.
- If integrating Drive Picker: `https://www.googleapis.com/auth/drive.readonly`.
