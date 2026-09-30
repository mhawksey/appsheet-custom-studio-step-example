# Dynamic Variables & Custom Resources

Google Workspace Studio supports dynamic output resources where field schemas are discovered dynamically at design-time, providing individual variable chips to downstream flow steps without requiring intermediate extraction steps.

---

## 1. Dynamic Output Resources (Custom Resources)

Dynamic custom resources allow custom steps (e.g., `appsheet_find_rows`, `appsheet_add_rows`, `appsheet_update_rows`) to expose dynamic column fields (such as `Name`, `Email`, `Department`, `Ticket ID`) based on the table configured in the step.

### Manifest Configuration (`appsscript.json`)

Declare `workflowResourceDefinitions` and `dynamicResourceDefinitionProvider` under `addOns.flows`:

```json
"addOns": {
  "flows": {
    "workflowElements": [
      {
        "id": "appsheet_find_rows",
        "state": "ACTIVE",
        "name": "Find Rows in AppSheet",
        "workflowAction": {
          "inputs": [ ... ],
          "outputs": [
            {
              "id": "firstRow",
              "description": "The first matching row with individual column fields.",
              "cardinality": "SINGLE",
              "dataType": {
                "resourceType": {
                  "workflowResourceDefinitionId": "appsheet_row_resource"
                }
              }
            },
            {
              "id": "foundRows",
              "description": "Full JSON array of matching rows.",
              "cardinality": "SINGLE",
              "dataType": { "basicType": "STRING" }
            }
          ],
          "onConfigFunction": "onConfigFindRows",
          "onExecuteFunction": "onExecuteFindRows"
        }
      }
    ],
    "workflowResourceDefinitions": [
      {
        "id": "appsheet_row_resource",
        "name": "AppSheet Row",
        "providerFunction": "onDynamicAppSheetRowProvider",
        "resourceType": "DYNAMIC"
      }
    ],
    "dynamicResourceDefinitionProvider": "onDynamicAppSheetRowDefinition"
  }
}
```

---

## 2. Design-Time Introspection (`dynamicResourceDefinitionProvider`)

When the user configures the step in Studio (e.g. entering the App ID and Table Name), Studio invokes `onDynamicAppSheetRowDefinition(e)`:

- **Event Object**:
  `e.workflow.resourceFieldsDefinitionRetrieval.inputs` contains the configured inputs (`appId`, `accessKey`, `tableName`).
- **Response**:
  Query the schema (e.g. `AppSheet.Find(tableName, [], { Selector: "TOP(..., 1)" })`) and return `AddOnsResponseService.newResourceFieldsDefinitionRetrievedAction()` with `ResourceField` definitions for each column:

```javascript
function onDynamicAppSheetRowDefinition(e) {
  const resourceDefinitions = AddOnsResponseService.newDynamicResourceDefinition()
    .setResourceId("appsheet_row_resource");

  const inputs = e.workflow?.resourceFieldsDefinitionRetrieval?.inputs || {};
  const appId = inputs.appId?.stringValues?.[0];
  const accessKey = inputs.accessKey?.stringValues?.[0];
  const tableName = inputs.tableName?.stringValues?.[0];

  if (appId && accessKey && tableName) {
    const AppSheet = new AppSheetApp(appId, accessKey);
    const sample = AppSheet.Find(tableName, [], { "Selector": `TOP(FILTER("${tableName}", TRUE), 1)` });
    if (sample && sample.length > 0) {
      Object.keys(sample[0]).forEach(colName => {
        resourceDefinitions.addResourceField(
          AddOnsResponseService.newResourceField()
            .setSelector(colName)
            .setDisplayText(colName)
        );
      });
    }
  }

  const workflowAction = AddOnsResponseService.newResourceFieldsDefinitionRetrievedAction()
    .addDynamicResourceDefinition(resourceDefinitions);

  const hostAppAction = AddOnsResponseService.newHostAppAction()
    .setWorkflowAction(workflowAction);

  return AddOnsResponseService.newRenderActionBuilder()
    .setHostAppAction(hostAppAction)
    .build();
}
```

---

## 3. Step Execution Returning Resource Reference

During flow execution, the step stores the row data in `CacheService` under a unique `resourceId` and returns a resource reference variable:

```javascript
function onExecuteFindRows(event) {
  // ... execute query ...
  const foundRows = response;
  const resourceId = "row_find_" + Utilities.getUuid();
  if (foundRows.length > 0) {
    CacheService.getScriptCache().put(resourceId, JSON.stringify(foundRows[0]), 21600);
  }

  const variables = {
    "firstRow": AddOnsResponseService.newVariableData().addResourceReference(resourceId),
    "foundRows": AddOnsResponseService.newVariableData().addStringValue(JSON.stringify(foundRows)),
    "rowCount": AddOnsResponseService.newVariableData().addIntegerValue(foundRows.length)
  };

  return returnOutputVariables(variables, `Successfully found ${foundRows.length} rows.`);
}
```

---

## 4. Runtime Field Retrieval (`providerFunction`)

When a subsequent step in the flow accesses a column chip (e.g. `firstRow.Name`), Studio invokes `providerFunction` (`onDynamicAppSheetRowProvider`):

- **Event Object**:
  `e.workflow.resourceRetrieval.resourceReference.resourceId` contains the unique ID generated during execution.
- **Response**:
  Retrieve the row from `CacheService` and return `AddOnsResponseService.newResourceRetrievedAction()` with `ResourceData` mapping column names to `VariableData`:

```javascript
function onDynamicAppSheetRowProvider(e) {
  const resourceId = e.workflow?.resourceRetrieval?.resourceReference?.resourceId;
  const resourceData = AddOnsResponseService.newResourceData();

  if (resourceId) {
    const cached = CacheService.getScriptCache().get(resourceId);
    if (cached) {
      const row = JSON.parse(cached);
      for (const col in row) {
        resourceData.addVariableData(
          col,
          AddOnsResponseService.newVariableData().addStringValue(String(row[col] ?? ""))
        );
      }
    }
  }

  const workflowAction = AddOnsResponseService.newResourceRetrievedAction()
    .setResourceData(resourceData);

  const hostAppAction = AddOnsResponseService.newHostAppAction()
    .setWorkflowAction(workflowAction);

  return AddOnsResponseService.newRenderActionBuilder()
    .setHostAppAction(hostAppAction)
    .build();
}
```

---

## 5. Single vs. Multiple Results Paradigm & Cardinality Constraints

In Google Workspace Studio, dynamic custom resources (`resourceType`) are designed to represent **a single entity or record** where downstream steps bind directly to named field chips.

### Platform Cardinality Constraint
In Workspace Studio's manifest schema, any output variable specifying `dataType.resourceType` **MUST** declare:
```json
"cardinality": "SINGLE"
```
Workspace Studio does not currently support arrays or lists of custom resource objects (`REPEATED` custom resources).

### Two-Tier Output Architecture for Tabular Steps
To support both single-record lookups and multi-record batch processing within the same custom step, implement a **two-tier output pattern**:

1. **Single-Record Chip Tier (`firstRow`, `addedRow`, `updatedRow`)**:
   * **Type**: `resourceType: { workflowResourceDefinitionId: "appsheet_row_resource" }`
   * **Cardinality**: `SINGLE`
   * **Usage**: Studio generates variable chips for every discovered column. Downstream steps (Gmail, Google Docs, Slack, etc.) can pick fields directly without intermediate parsing steps.
   * **Empty Result Handling**: If a search returns 0 matching rows, the step still returns a valid resource reference. In `providerFunction`, if the cache key is missing or empty, populate each requested field with an empty string (`""`) rather than erroring out.

2. **Multi-Record Collection Tier (`foundRows`, `addedRows`, `updatedRows` & `rowCount`)**:
   * **`foundRows`**: `basicType: "STRING"`, `cardinality: "SINGLE"`. Serialized JSON string array containing all matching row objects (`[ { ... }, { ... } ]`).
   * **`rowCount`**: `basicType: "INTEGER"`, `cardinality: "SINGLE"`. Number of matching rows returned.
   * **Usage**:
     * **Batch Chaining**: Pass the JSON string directly into another step's array input (`rowsData`).
     * **Conditionals**: Branch flow execution based on `rowCount > 0` or `rowCount === 1`.
     * **Looping**: Ingest the JSON array in Studio list actions or custom script steps for iteration.

