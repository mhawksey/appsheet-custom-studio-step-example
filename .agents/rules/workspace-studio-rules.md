# Workspace Studio Custom Step Development Rules

These rules govern Google Workspace Studio custom step and starter development within this repository.

## 1. Manifest Synchronization & Integrity
- **Contract Parity**: Every input and output declared in `appsscript.json` under `addOns.flows.workflowElements[].workflowAction` MUST be properly processed and returned by the corresponding `onExecuteFunction`.
- **Cardinality Compliance**:
  - `SINGLE`: Expected at index `[0]` of the typed values array (e.g., `event.workflow.actionInvocation.inputs["myVar"].stringValues[0]`).
  - `REPEATED`: Expected as the full array (e.g., `event.workflow.actionInvocation.inputs["myList"].stringValues`).
  - **Custom Resources (`resourceType`)**: In Google Workspace Studio's current architecture, **`resourceType` output variables strictly mandate `"cardinality": "SINGLE"`**. Repeated arrays of custom resource chips are not supported by the platform.
- **State Lifecycle**: Use `"state": "ACTIVE"` for production, `"DRAFT"` for internal testing in Studio, and `"DEPRECATED"` when retiring steps.
- **Locale & OAuth Scopes Invariant**:
  - `"useLocaleFromApp"` in `addOns.common` is **optional**.
  - If the custom step does not need user language/locale formatting, **omit** `"useLocaleFromApp"` to maintain a least-privilege OAuth consent profile.
  - If `"useLocaleFromApp": true` is specified, the manifest's `oauthScopes` **MUST** explicitly include `"https://www.googleapis.com/auth/script.locale"`.
  - Declaring explicit `oauthScopes` while omitting `https://www.googleapis.com/auth/script.locale` when `"useLocaleFromApp": true` is present causes a fatal runtime permission error: `Required permissions: https://www.googleapis.com/auth/script.locale`.

## 2. Defensive Input Parsing
- Workspace Studio flow execution can pass values as strings even when defined as numeric or date types, especially when piped from other integrations.
- Always use defensive extraction helper functions:
  ```javascript
  function getIntValue(varData) {
    if (!varData) return 0;
    if (varData.integerValues && varData.integerValues.length > 0) return varData.integerValues[0];
    if (varData.stringValues && varData.stringValues.length > 0) return parseInt(varData.stringValues[0], 10);
    return 0;
  }
  ```

## 3. Output Variable Contract & Two-Tier Results
- Every execution handler MUST return all outputs declared in the manifest.
- **Two-Tier Output Architecture for Tabular Data**: Steps returning database/table records must provide:
  1. **Single Record Chip Tier**: A dynamic custom resource (`cardinality: "SINGLE"`) representing the first/primary record (`firstRow`, `addedRow`, `updatedRow`) for seamless field binding in downstream steps.
  2. **Collection Tier**: A serialized JSON string (`cardinality: "SINGLE"`, `basicType: "STRING"`) containing the full array of rows (`foundRows`, `addedRows`, `updatedRows`), alongside an integer `rowCount`, for bulk passing and loop steps.
- **Empty Result Invariant**: When 0 rows match, steps MUST still return a valid resource reference. The dynamic provider function must handle missing/null cache records gracefully by setting empty strings (`""`) for all requested fields rather than throwing an exception.
- Construct output actions using `AddOnsResponseService`:
  ```javascript
  const workflowAction = AddOnsResponseService.newReturnOutputVariablesAction()
    .setVariableDataMap({
      "output_id": AddOnsResponseService.newVariableData().addStringValue(resultValue)
    })
    .setLog(AddOnsResponseService.newWorkflowTextFormat().addTextFormatElement(...));

  const hostAppAction = AddOnsResponseService.newHostAppAction()
    .setWorkflowAction(workflowAction);

  return AddOnsResponseService.newRenderActionBuilder()
    .setHostAppAction(hostAppAction)
    .build();
  ```

## 4. Error Handling, Actionability & AppSheet Payloads
- **AppSheet Error Structure (RFC 7807/9110)**: AppSheet REST API error responses return HTTP Problem Details: `{ "type": "...", "title": "...", "status": 400, "detail": "..." }`. They do NOT include an `Error` property. Handlers MUST check `response.detail`, `response.title`, and `response.Error` to prevent silent false-positive successes.
- **CacheService Size Limits**: `CacheService` has a strict 100 KB (102,400 bytes) limit per entry. Always guard row caching with a safety check (e.g. `< 100000` serialized bytes) to avoid unhandled script termination when caching large records.
- **Actionable Errors** (`AddOnsResponseService.ErrorActionability.ACTIONABLE`): Use when user input is invalid (missing table name, invalid selector expression, malformed row JSON). This renders a button in the Activity log directing the user to the step's configuration card.
- **Retryable Errors** (`AddOnsResponseService.ErrorRetryability.RETRYABLE`): Use for transient network or rate-limit failures from AppSheet API. Flow will automatically retry up to 5 times.
- **Activity Logging**: Return clear, styled logs using `newWorkflowTextFormat()` with `newStyledText()` to inform users of execution outcomes.

## 5. Security & Clasp Hygiene
- Never commit AppSheet `ApplicationAccessKey` or `AppId` to Git.
- Use `PropertiesService.getScriptProperties()` or pass credentials securely via step input variables.
- Keep `.claspignore` updated to prevent uploading `.agents/`, `docs/`, `node_modules/`, `package*.json`, and markdown files to the remote Apps Script project.

### ⚠️ Critical Invariant: Git vs. Clasp Ignore Handling of `.env.js`
- **Git (`.gitignore`)**: `.env.js` MUST be ignored by Git so that credentials are never committed or pushed to GitHub.
- **Clasp (`.claspignore`)**: `.env.js` MUST NOT be ignored by Clasp. In Google Apps Script, `.env.js` is required to be pushed to the private Apps Script project so that test credentials (`CONFIG`) are available in global scope to `Tests.js` when executing tests in the Apps Script editor.
- **Rule**: NEVER add `.env.js` to `.claspignore`. Only the example template `.env_ex.js` belongs in `.claspignore`.
