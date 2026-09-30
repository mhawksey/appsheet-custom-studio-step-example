---
name: appsheet-api-integration
description: >
  Guide for integrating Google Workspace Studio custom steps with AppSheet's REST API. Covers authentication,
  API endpoints for Add, Edit, Find, and Delete actions, constructing AppSheet formula expressions/selectors
  (FILTER, SELECT, TOP, ORDERBY), resolving key columns, and dynamic schema introspection.
---

# AppSheet API Integration for Google Workspace Studio

This skill provides patterns, API schemas, and formula references for integrating Google Workspace Studio custom steps with AppSheet applications via the AppSheet REST API.

---

## Architecture & Authentication

All AppSheet REST API requests target:
```
POST https://api.appsheet.com/api/v2/apps/{appId}/tables/{tableName}/Action
```

### Required Headers
- `ApplicationAccessKey`: Secret API key generated in the AppSheet editor under **Manage** > **Integrations** > **In/Out** > **Enable API**.
- `Content-Type`: `application/json`.

### Client Initialization in Apps Script
In this repository, the `AppSheetApp` class (`AppSheetApp.js`) encapsulates requests:
```javascript
const client = new AppSheetApp(appId, accessKey);
```

---

## Core Operations

### 1. `Add` (Insert Rows)
Inserts new rows into the target table.
```javascript
const rowsToAdd = [
  {
    "Customer Name": "Acme Corp",
    "Status": "Pending",
    "Amount": 500.00
  }
];
const result = client.Add(tableName, rowsToAdd);
```
👉 See [references/appsheet-rest-api.md](references/appsheet-rest-api.md#1-add-action).

---

### 2. `Edit` (Update Rows)
Updates existing rows. **Must** include the row's key column (or key columns if composite key).
```javascript
const rowsToUpdate = [
  {
    "OrderID": "ORD-1001", // Key Column
    "Status": "Approved"
  }
];
const result = client.Edit(tableName, rowsToUpdate);
```
👉 See [references/appsheet-rest-api.md](references/appsheet-rest-api.md#2-edit-action).

---

### 3. `Find` (Query Rows with Selectors)
Retrieves rows matching a selector formula expression:
```javascript
const selector = `FILTER("${tableName}", [Status] = "Pending")`;
const result = client.Find(tableName, [], { "Selector": selector });
```
👉 See [references/appsheet-selectors.md](references/appsheet-selectors.md) for expression syntax.

---

### 4. `Delete` (Remove Rows)
Deletes rows by key column:
```javascript
const rowsToDelete = [
  { "OrderID": "ORD-1001" }
];
const result = client.Delete(tableName, rowsToDelete);
```

---

## Dynamic Table Schema Introspection

To build flexible Studio configuration cards that automatically adapt to any AppSheet table without hardcoding column names:
1. Call AppSheet `Find` with `TOP(..., 1)` to fetch a single sample row.
2. Extract `Object.keys(sampleRow[0])` to retrieve physical and virtual column headers.
3. Dynamically generate card widgets mapped to those columns.

👉 See [references/schema-introspection.md](references/schema-introspection.md) for the complete implementation.

---

## Detailed References

- [AppSheet REST API Payloads & Endpoints (`references/appsheet-rest-api.md`)](references/appsheet-rest-api.md)
- [AppSheet Selector Expressions & Formulas (`references/appsheet-selectors.md`)](references/appsheet-selectors.md)
- [Dynamic Schema Introspection Guide (`references/schema-introspection.md`)](references/schema-introspection.md)
