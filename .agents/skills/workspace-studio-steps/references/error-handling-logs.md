# Error Handling & Activity Logs

Google Workspace Studio displays execution history and error diagnostics on the **Activity Tab** (`https://studio.workspace.google.com/manage?tab=activity`).

Add-ons must return structured error responses to control how the flow responds when failures occur.

---

## 1. Actionable vs. Unactionable Errors

| Type | Constant | Behavior in Studio | Use Case |
| :--- | :--- | :--- | :--- |
| **Actionable** | `ErrorActionability.ACTIONABLE` | Shows a "Fix input" button in the Activity log linking to the step's card | User errors: missing parameters, malformed JSON, table does not exist |
| **Not Actionable** | `ErrorActionability.NOT_ACTIONABLE` | Displays error message without configuration link | System errors, unrecoverable authorization failures |

---

## 2. Retryable vs. Non-Retryable Errors

| Type | Constant | Behavior in Studio | Use Case |
| :--- | :--- | :--- | :--- |
| **Retryable** | `ErrorRetryability.RETRYABLE` | Studio automatically retries step execution up to 5 times | Transient network blips, 429 rate limits, external API timeouts |
| **Not Retryable** | `ErrorRetryability.NOT_RETRYABLE` | Halts execution immediately | Validation errors, 401 unauthorized, 404 resource not found |

---

## 3. Implementing Error Responses

```javascript
/**
 * Global error handler for Workspace Studio custom steps.
 * @param {Error|object} err - Caught error object.
 * @param {boolean} isActionable - Whether user input can resolve it.
 * @param {boolean} isRetryable - Whether the flow should retry.
 */
function buildErrorResponse(err, isActionable = true, isRetryable = false) {
  console.error("Step execution error:", err);

  const errorMessage = err.message || err.toString() || "Unknown execution error";

  const workflowAction = AddOnsResponseService.newReturnElementErrorAction()
    // User-facing message in the Activity tab
    .setErrorLog(
      AddOnsResponseService.newWorkflowTextFormat()
        .addTextFormatElement(
          AddOnsResponseService.newTextFormatElement()
            .setText(`⚠️ Error: ${errorMessage}`)
        )
    )
    // Actionability controls whether user can click to reconfigure
    .setErrorActionability(
      isActionable
        ? AddOnsResponseService.ErrorActionability.ACTIONABLE
        : AddOnsResponseService.ErrorActionability.NOT_ACTIONABLE
    )
    // Retryability controls automated retry by Studio runner
    .setErrorRetryability(
      isRetryable
        ? AddOnsResponseService.ErrorRetryability.RETRYABLE
        : AddOnsResponseService.ErrorRetryability.NOT_RETRYABLE
    );

  const hostAppAction = AddOnsResponseService.newHostAppAction()
    .setWorkflowAction(workflowAction);

  return AddOnsResponseService.newRenderActionBuilder()
    .setHostAppAction(hostAppAction)
    .build();
}
```

---

## 4. Rich Activity Logs

Success logs can include styled text, bold headers, and monospace IDs:

```javascript
const textFormat = AddOnsResponseService.newWorkflowTextFormat()
  .addTextFormatElement(
    AddOnsResponseService.newTextFormatElement()
      .setStyledText(
        AddOnsResponseService.newStyledText()
          .setText("AppSheet Step Succeeded: ")
          .addStyle(AddOnsResponseService.TextStyle.ITALIC)
      )
  )
  .addTextFormatElement(
    AddOnsResponseService.newTextFormatElement()
      .setStyledText(
        AddOnsResponseService.newStyledText()
          .setText("Inserted row with Key: ")
      )
  )
  .addTextFormatElement(
    AddOnsResponseService.newTextFormatElement()
      .setStyledText(
        AddOnsResponseService.newStyledText()
          .setText(recordId)
          .setFontWeight(AddOnsResponseService.FontWeight.BOLD)
      )
  );

outputAction.setLog(textFormat);
```
