# Workspace Studio Test Deployment Guide

To test custom steps inside the **Google Workspace Studio** flow builder (`https://studio.workspace.google.com/`), your Google Apps Script add-on must be installed as a **Test Deployment** for your account.

> [!IMPORTANT]
> **Admin Console Prerequisite (Google Workspace Accounts)**:  
> Custom steps are **OFF by default** for Google Workspace accounts. A domain administrator must enable them in the Admin Console:
> 1. Go to **Apps** > **Google Workspace** > **Settings for Workspace Studio** > **Custom steps settings**.
> 2. Set **Custom steps access** to **ON**.
> 3. Check **Allow unpublished (test) custom steps** (*"Flows can use unpublished custom steps. Step developers can test unpublished custom steps and share them with others to use."*).
> 4. Save changes. If this setting is not enabled, the step will appear disabled with the message: *"Access to these steps is restricted by your Workspace admin"*.
> *(Consumer `@gmail.com` accounts do not have this restriction).*

---

## Step-by-Step Installation

### 1. Push Latest Code
Ensure your latest changes are pushed:
```bash
clasp push
```

### 2. Open Project in Browser
```bash
clasp open
```

### 3. Open Test Deployments Dialog
1. In the upper-right corner of the Apps Script editor, click **Deploy** > **Test deployments**.
2. If this is your first time, click **Select type** (the gear icon) and choose **Google Workspace Add-on**.
3. Under **Application(s)**, ensure the add-on details match your `appsscript.json` common configuration.

### 4. Install the Test Add-on
1. Click **Install**.
2. Once installed, the status will show **Installed for test**.
3. Click **Done**.

---

## Testing Custom Steps in Workspace Studio

1. Navigate to [Google Workspace Studio](https://studio.workspace.google.com/).
2. Create a new flow or open an existing one.
3. Click the **+** (Add step) button between or after steps.
4. In the step catalog search bar, search for your add-on name (e.g. `AppSheet Utilities for Studio`) or the custom step name (e.g. `Add Rows to AppSheet`).
5. Click the custom step to insert it into the flow canvas.
6. The sidebar opens displaying the card rendered by `onConfigFunction`.
7. Configure the parameters or bind outputs from previous steps as chips.
8. Run or test-trigger the flow and check the **Activity tab** (`https://studio.workspace.google.com/manage?tab=activity`) to observe execution logs, outputs, and any actionable error dialogs.

---

## Refreshing After Code Changes

When you make changes to `Code.js` or `appsscript.json`:
1. Run `clasp push`.
2. Because the test deployment is tied to the **@HEAD** (live) version of your Apps Script project, code updates take effect immediately without needing to reinstall the test deployment.
3. Refresh the Workspace Studio tab in your browser to reload updated card schemas.
