# Execution & Event Handling

When a Google Workspace Studio flow reaches a custom step, it invokes the function named in `workflowAction.onExecuteFunction(event)`.

---

## 1. Event Object Structure (`actionInvocation`)

```json
{
  "workflow": {
    "triggerEventSource": "TRIGGER_EVENT_SOURCE_AUTOMATED",
    "actionInvocation": {
      "inputs": {
        "appId": {
          "stringValues": ["62e27d6a-ca5c-4167-b117-76f16af654d5"]
        },
        "tableName": {
          "stringValues": ["Documents"]
        },
        "rowCountLimit": {
          "integerValues": [5]
        },
        "isActive": {
          "booleanValues": [true]
        }
      }
    }
  },
  "commonEventObject": {
    "timeZone": { "id": "America/New_York", "offset": -14400000 },
    "userLocale": "en-US",
    "hostApp": "WORKFLOW",
    "platform": "WEB"
  }
}
```

---

## 2. Safe Typed Input Extractors

Studio inputs can arrive as typed arrays or as string representations when mapped across steps. Always use defensive extractor functions:

```javascript
/**
 * Safely extracts a string value from variable data.
 */
function getStringValue(varData, defaultValue = "") {
  if (!varData) return defaultValue;
  if (varData.stringValues && varData.stringValues.length > 0) {
    return varData.stringValues[0];
  }
  return defaultValue;
}

/**
 * Safely extracts an integer, parsing string values if necessary.
 */
function getIntValue(varData, defaultValue = 0) {
  if (!varData) return defaultValue;
  if (varData.integerValues && varData.integerValues.length > 0) {
    return varData.integerValues[0];
  }
  if (varData.stringValues && varData.stringValues.length > 0) {
    const parsed = parseInt(varData.stringValues[0], 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
}

/**
 * Safely extracts a boolean value.
 */
function getBooleanValue(varData, defaultValue = false) {
  if (!varData) return defaultValue;
  if (varData.booleanValues && varData.booleanValues.length > 0) {
    return varData.booleanValues[0];
  }
  if (varData.stringValues && varData.stringValues.length > 0) {
    return varData.stringValues[0].toLowerCase() === "true";
  }
  return defaultValue;
}

/**
 * Safely extracts an array of values for REPEATED cardinality.
 */
function getRepeatedStringValues(varData) {
  if (!varData) return [];
  if (varData.stringValues) return varData.stringValues;
  return [];
}
```

---

## 3. Returning Output Variables

Every output defined in the step's manifest `outputs[]` must be populated in the return payload.

### Using `AddOnsResponseService` (Recommended)
```javascript
function onExecuteAddRows(e) {
  try {
    const inputs = e.workflow.actionInvocation.inputs;
    const appId = getStringValue(inputs["appId"]);
    const tableName = getStringValue(inputs["tableName"]);
    const rowsJson = getStringValue(inputs["rowsData"]);

    const rows = JSON.parse(rowsJson);
    const client = new AppSheetApp(appId, getAccessKey());
    const apiResult = client.Add(tableName, rows);

    // Build Output Variables
    const workflowAction = AddOnsResponseService.newReturnOutputVariablesAction()
      .setVariableDataMap({
        "success": AddOnsResponseService.newVariableData().addBooleanValue(true),
        "addedRowsCount": AddOnsResponseService.newVariableData().addIntegerValue(rows.length),
        "responsePayload": AddOnsResponseService.newVariableData().addStringValue(JSON.stringify(apiResult))
      })
      .setLog(
        AddOnsResponseService.newWorkflowTextFormat()
          .addTextFormatElement(
            AddOnsResponseService.newTextFormatElement()
              .setStyledText(
                AddOnsResponseService.newStyledText()
                  .setText(`Successfully inserted ${rows.length} row(s) into ${tableName}.`)
                  .setFontWeight(AddOnsResponseService.FontWeight.BOLD)
              )
          )
      );

    const hostAppAction = AddOnsResponseService.newHostAppAction()
      .setWorkflowAction(workflowAction);

    return AddOnsResponseService.newRenderActionBuilder()
      .setHostAppAction(hostAppAction)
      .build();

  } catch (err) {
    return handleExecutionError(err);
  }
}
```

### JSON Response Equivalence
```json
{
  "hostAppAction": {
    "workflowAction": {
      "returnOutputVariablesAction": {
        "variableValues": [
          {
            "variableId": "success",
            "variableData": { "booleanValues": [true] }
          },
          {
            "variableId": "addedRowsCount",
            "variableData": { "integerValues": [1] }
          }
        ],
        "log": {
          "textFormatElements": [
            { "text": "Successfully added 1 row." }
          ]
        }
      }
    }
  }
}
```
