---
name: workspace-studio-steps
description: >
  Comprehensive guide for creating, configuring, executing, and debugging Google Workspace Studio custom steps (actions)
  and starters (triggers). Covers manifest schema (appsscript.json), CardService configuration card UI, input/output
  variable bindings, actionInvocation event handling, AddOnsResponseService output variables, and actionable/retryable
  error logging.
---

# Google Workspace Studio Custom Steps & Starters Development

Google Workspace Studio (formerly Workspace Flows) allows users to build multi-step automated workflows across Workspace and third-party tools. Custom steps and starters extend Studio with custom integrations built on the Google Workspace Add-ons (GWAO) architecture in Google Apps Script.

## Architecture Overview

A Workspace Studio custom step consists of four core components:
1. **Manifest Registration (`appsscript.json`)**: Declares the action ID, user-facing name, inputs, outputs, configuration card function (`onConfigFunction`), and execution function (`onExecuteFunction`).
2. **Configuration Card (`onConfigFunction`)**: Interactive UI built with `CardService` (or JSON action format) presented in the Studio sidebar, allowing workflow creators to configure parameters or bind variables from preceding steps.
3. **Execution Logic (`onExecuteFunction`)**: Runtime handler triggered when a flow step runs. Receives the `event.workflow.actionInvocation` payload with typed inputs and returns typed outputs.
4. **Activity & Error Logging (`AddOnsResponseService`)**: User-facing execution logs and actionable/retryable error actions displayed in the Workspace Studio Activity tab.

```
┌─────────────────────────────────────────────────────────────┐
│                       Workspace Studio                      │
│                                                             │
│   [Trigger] ──> [Preceding Step] ──> [Custom Step]         │
└────────────────────────────────────────────┬────────────────┘
                                             │
                       Config / Execution    │ Event Object
                                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   Google Apps Script                        │
│                                                             │
│  1. appsscript.json   (Manifest declaring inputs/outputs)  │
│  2. onConfiguration() (CardService UI with variable binding)│
│  3. onExecution(e)    (Reads inputs, executes APIs)        │
│  4. AddOnsResponseService (Returns outputs & activity log)  │
└─────────────────────────────────────────────────────────────┘
```

---

## Development Workflow

### Phase 1: Declare the Step in `appsscript.json`
Under `"addOns": { "flows": { "workflowElements": [ ... ] } }` (or `"studio": { "flows": ... }`), define:
- `id`: Unique identifier (e.g. `appsheet_add_rows`).
- `state`: `"ACTIVE"`, `"DRAFT"`, or `"DEPRECATED"`.
- `name` & `description`: User-facing labels.
- `workflowAction.inputs`: Array of typed input parameters (`SINGLE` or `REPEATED`).
- `workflowAction.outputs`: Array of typed output parameters.
- `onConfigFunction`: Apps Script function name for rendering the config card.
- `onExecuteFunction`: Apps Script function name for step execution.

*Scope & Locale Guidelines*:
- If defining `oauthScopes`, ensure external request permissions (`https://www.googleapis.com/auth/script.external_request`) are included.
- `"useLocaleFromApp"` in `addOns.common` is optional. Only set to `true` if your callbacks require localized user formatting. If set to `true`, `"https://www.googleapis.com/auth/script.locale"` MUST be included in `oauthScopes` to prevent fatal runtime errors.

👉 See [references/manifest-spec.md](references/manifest-spec.md) for full manifest schema and supported basic/custom data types.

---

### Phase 2: Build the Configuration Card UI
The `onConfigFunction` returns a `CardService.Card` or a navigation action.

Key configuration card rules:
1. **Enable Variable Binding**: Set `setHostAppDataSource(CardService.newHostAppDataSource().setWorkflowDataSource(CardService.newWorkflowDataSource().setIncludeVariables(true)))` on input widgets (`newTextInput()`, `newSelectionInput()`, etc.) so users can map outputs from preceding flow steps as chips.
2. **Dynamic Updates**: When a field selection changes (e.g., selecting a table name to fetch columns), trigger an interactive action returning `AddOnsResponseService.newRenderActionBuilder().setHostAppAction(...)` or `update_card` navigation.
3. **Save Action**: Use the host app save action so the Studio flow editor saves the configured inputs.

👉 See [references/card-ui-guide.md](references/card-ui-guide.md) for UI card building and widget patterns.

---

### Phase 3: Implement the Execution Handler
The `onExecuteFunction(event)` receives the runtime event object:
1. **Extract Inputs**:
   Access variables under `event.workflow.actionInvocation.inputs[<variableId>]`.
   Extract according to type (`stringValues`, `integerValues`, `booleanValues`, `doubleValues`, `dateValues`, `dateTimeValues`, `customResources`).
   *Always use defensive parsing helpers* to handle type conversions.
2. **Execute Business Logic**:
   Call external APIs (e.g. AppSheet API via `UrlFetchApp`), Google Workspace APIs, or internal logic.
3. **Return Output Variables (Two-Tier Pattern)**:
   For steps returning tabular/record data, return both:
   * **Single Record Dynamic Resource (`cardinality: "SINGLE"`)**: `firstRow`, `addedRow`, or `updatedRow` referencing a cached record for direct column chip mapping in downstream steps.
   * **Collection JSON String (`cardinality: "SINGLE"`)**: `foundRows`, `addedRows`, or `updatedRows` stringified array + `rowCount` integer for multi-record batch passing and loops.
   Return all outputs defined in the manifest using `AddOnsResponseService.newReturnOutputVariablesAction()`:
   ```javascript
   const workflowAction = AddOnsResponseService.newReturnOutputVariablesAction()
     .setVariableDataMap({
       "firstRow": AddOnsResponseService.newVariableData().addResourceReference(resourceId),
       "foundRows": AddOnsResponseService.newVariableData().addStringValue(JSON.stringify(rows)),
       "rowCount": AddOnsResponseService.newVariableData().addIntegerValue(rows.length)
     })
     .setLog(AddOnsResponseService.newWorkflowTextFormat().addTextFormatElement(...));

   const hostAppAction = AddOnsResponseService.newHostAppAction()
     .setWorkflowAction(workflowAction);

   return AddOnsResponseService.newRenderActionBuilder()
     .setHostAppAction(hostAppAction)
     .build();
   ```

👉 See [references/dynamic-variables-resources.md](references/dynamic-variables-resources.md) for dynamic custom resource design, single vs. multiple results handling, and caching.
👉 See [references/execution-and-events.md](references/execution-and-events.md) for event schemas, input extraction functions, and output constructors.

---

### Phase 4: Handle Errors & Activity Logging
Never let unhandled exceptions escape silently. Wrap `onExecuteFunction` in a `try...catch` block:
- **User / Input Errors (`ACTIONABLE`)**:
  Return `AddOnsResponseService.newReturnElementErrorAction().setErrorActionability(AddOnsResponseService.ErrorActionability.ACTIONABLE)`. Studio displays a "Fix input" button in the Activity log taking the user directly to the step configuration card.
- **Transient / System Errors (`RETRYABLE`)**:
  Return `AddOnsResponseService.newReturnElementErrorAction().setErrorRetryability(AddOnsResponseService.ErrorRetryability.RETRYABLE)`. Studio will automatically retry the step up to 5 times.
- **Activity Log Styling**:
  Use `newWorkflowTextFormat()` with `newStyledText()` to render styled status messages, links, and chips in the Studio Activity tab.

👉 See [references/error-handling-logs.md](references/error-handling-logs.md) for complete error and log patterns.

---

## Detailed References

- [Manifest Specification (`references/manifest-spec.md`)](references/manifest-spec.md)
- [Configuration Card UI Guide (`references/card-ui-guide.md`)](references/card-ui-guide.md)
- [Execution & Event Handling (`references/execution-and-events.md`)](references/execution-and-events.md)
- [Error Handling & Activity Logs (`references/error-handling-logs.md`)](references/error-handling-logs.md)
- [Dynamic Variables & Custom Resources (`references/dynamic-variables-resources.md`)](references/dynamic-variables-resources.md)
- [Mock Event Runner (`examples/mock-event-runner.js`)](examples/mock-event-runner.js)
