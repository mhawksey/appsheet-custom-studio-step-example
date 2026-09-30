# Manifest Specification (`appsscript.json`)

Google Workspace Studio add-ons define their capabilities inside `appsscript.json` under the `addOns` section.

## Schema Location

In Workspace Studio, custom steps and starters are configured under:
```json
{
  "timeZone": "America/New_York",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/script.locale"
  ],
  "addOns": {
    "common": {
      "name": "Add-on Display Name",
      "logoUrl": "https://www.gstatic.com/images/branding/product/1x/appsheet_64dp.png",
      "useLocaleFromApp": true
    },
    "flows": {
      "workflowElements": [
        { ... }
      ]
    }
  }
}
```
*(Note: In some newer preview environments, `"addOns": { "studio": { "flows": { "workflowElements": [...] } } }` is also accepted, but `"addOns": { "flows": { ... } }` is the standard).*

---

## Common Configuration (`addOns.common`)
- `name` *(Required)*: Display name of the custom step collection.
- `logoUrl` *(Required)*: Square icon URL displayed in Workspace Studio.
- `useLocaleFromApp` *(Optional, boolean)*:
  - If set to `true`, Google Workspace passes the user's host application locale and timezone to callback event objects (`e.commonEventObject.userLocale`).
  - **Important**: Setting this to `true` strictly requires the `https://www.googleapis.com/auth/script.locale` OAuth scope.
  - If dynamic localization is not required by your step, **omit this property or set it to `false`** to avoid requesting unnecessary OAuth permissions from users.

---

## OAuth Scopes (`oauthScopes`)

When defining `oauthScopes` in `appsscript.json`, Apps Script suppresses automatic scope deduction:
- `https://www.googleapis.com/auth/script.external_request`: Required when calling external endpoints via `UrlFetchApp` (e.g., AppSheet REST API).
- `https://www.googleapis.com/auth/script.locale`: **Mandatory if `"useLocaleFromApp": true` is set**. Omitting it will throw a fatal runtime error during execution (`Required permissions: https://www.googleapis.com/auth/script.locale`). Omit both the setting and this scope if not localizing.

---

## Workflow Element Schema (Custom Step)

Each element inside `workflowElements` represents an action or trigger:

```json
{
  "id": "appsheet_add_rows",
  "state": "ACTIVE",
  "name": "Add Rows to AppSheet",
  "description": "Appends one or more rows to an AppSheet table.",
  "workflowAction": {
    "inputs": [
      {
        "id": "appId",
        "description": "The unique AppSheet Application ID",
        "cardinality": "SINGLE",
        "dataType": {
          "basicType": "STRING"
        }
      },
      {
        "id": "tableName",
        "description": "Target table name in AppSheet",
        "cardinality": "SINGLE",
        "dataType": {
          "basicType": "STRING"
        }
      },
      {
        "id": "rowsData",
        "description": "JSON array of row objects to insert",
        "cardinality": "SINGLE",
        "dataType": {
          "basicType": "STRING"
        }
      }
    ],
    "outputs": [
      {
        "id": "success",
        "description": "True if operation succeeded",
        "cardinality": "SINGLE",
        "dataType": {
          "basicType": "BOOLEAN"
        }
      },
      {
        "id": "addedRowsCount",
        "description": "Number of rows successfully inserted",
        "cardinality": "SINGLE",
        "dataType": {
          "basicType": "INTEGER"
        }
      },
      {
        "id": "responsePayload",
        "description": "Raw JSON response from AppSheet",
        "cardinality": "SINGLE",
        "dataType": {
          "basicType": "STRING"
        }
      }
    ],
    "onConfigFunction": "onConfigAddRows",
    "onExecuteFunction": "onExecuteAddRows"
  }
}
```

---

## Data Types

### Basic Types (`dataType.basicType`)
| Type | Description | JSON Value Mapping |
| :--- | :--- | :--- |
| `STRING` | Plain text | `stringValues: ["text"]` |
| `INTEGER` | Whole numbers (64-bit int) | `integerValues: [42]` |
| `DOUBLE` | Floating point numbers | `doubleValues: [3.1415]` |
| `BOOLEAN` | True or False | `booleanValues: [true]` |
| `DATE` | Calendar date (YYYY-MM-DD) | `dateValues: ["2026-09-19"]` |
| `TIME` | Time of day (HH:mm:ss) | `timeValues: ["14:30:00"]` |
| `DATE_TIME` | ISO timestamp | `dateTimeValues: ["2026-09-19T14:30:00Z"]` |

### Custom / Dynamic Resource Type (`dataType.resourceType`)
References a dynamic entity defined in `addOns.flows.workflowResourceDefinitions`:
```json
"dataType": {
  "resourceType": {
    "workflowResourceDefinitionId": "appsheet_row_resource"
  }
}
```

### Dynamic Resource Manifest Configuration (`addOns.flows`)
To support dynamic output variables where Studio introspects fields at design-time:
```json
"addOns": {
  "flows": {
    "workflowElements": [ ... ],
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

## Cardinality
- `"SINGLE"`: Exactly one value expected (accessed at index `[0]`).
- `"REPEATED"`: A list/array of values of the specified type (e.g. repeated strings).
- **Custom Resource Constraint**: When `dataType` uses `resourceType`, cardinality **MUST** be `"SINGLE"`. Workspace Studio does not support arrays of custom resource objects (`REPEATED` custom resources). For multi-record collections, pass serialized JSON arrays as a `STRING` output (`cardinality: "SINGLE"`) alongside an `INTEGER` count.

---

## Lifecycle States (`state`)
- `"ACTIVE"`: Visible and usable in the Google Workspace Studio flow builder.
- `"DRAFT"`: Visible only to test users or owners for development.
- `"DEPRECATED"`: Existing flows continue to run, but users cannot add new instances of this step.
