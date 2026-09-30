# Dynamic Table Schema Introspection

To make Google Workspace Studio custom steps reusable across arbitrary AppSheet apps and tables, steps can dynamically inspect table columns and render interactive input fields in the configuration card.

---

## 1. Column Discovery Technique

Because AppSheet's API does not expose a dedicated `DESCRIBE TABLE` endpoint, use the `Find` action with a selector requesting a single record:

```javascript
/**
 * Fetches column names for a table by inspecting a sample record.
 * @param {string} appId - AppSheet Application ID.
 * @param {string} accessKey - Application Access Key.
 * @param {string} tableName - Target table name.
 * @returns {string[]} Array of column header names.
 */
function fetchTableColumnNames(appId, accessKey, tableName) {
  const client = new AppSheetApp(appId, accessKey);
  const selector = `TOP(FILTER("${tableName}", TRUE), 1)`;
  
  const result = client.Find(tableName, [], { "Selector": selector });

  if (result.Error) {
    throw new Error(`Failed to fetch schema: ${result.Error}`);
  }

  if (result && result.length > 0) {
    // Keys of the first row object represent the table columns
    return Object.keys(result[0]);
  }

  return [];
}
```

---

## 2. Rendering Dynamic Inputs in Card UI

When the user clicks "Fetch Fields" or changes the selected table:

```javascript
function onFetchTableFields(e) {
  const formInputs = e.commonEventObject.formInputs;
  const appId = formInputs.appId?.stringInputs?.value?.[0];
  const tableName = formInputs.tableName?.stringInputs?.value?.[0];

  const columns = fetchTableColumnNames(appId, getAccessKey(), tableName);

  const dynamicSection = CardService.newCardSection()
    .setHeader(`Columns for ${tableName}`)
    .setDescription("Map workflow variables or enter static values for each column:");

  const workflowDataSource = CardService.newWorkflowDataSource()
    .setIncludeVariables(true);

  const hostAppDataSource = CardService.newHostAppDataSource()
    .setWorkflowDataSource(workflowDataSource);

  columns.forEach(column => {
    // Skip internal AppSheet row keys if not desired
    if (column.startsWith("_")) return;

    dynamicSection.addWidget(
      CardService.newTextInput()
        .setId(`col_${column}`)
        .setFieldName(`col_${column}`)
        .setTitle(column)
        .setHostAppDataSource(hostAppDataSource)
    );
  });

  // Return updated card
  return CardService.newActionResponseBuilder()
    .setNavigation(
      CardService.newNavigation()
        .updateCard(
          CardService.newCardBuilder()
            .addSection(buildStaticConfigSection(appId, tableName))
            .addSection(dynamicSection)
            .build()
        )
    )
    .build();
}
```

---

## 3. Assembling Row Data in Execution

When the flow executes, extract all inputs with the `col_` prefix and assemble them into a JSON payload for the `Add` or `Edit` action:

```javascript
function extractDynamicRowInputs(inputs, prefix = "col_") {
  const row = {};
  for (const key in inputs) {
    if (key.startsWith(prefix)) {
      const colName = key.replace(prefix, "");
      const val = inputs[key].stringValues?.[0];
      if (val !== undefined && val !== "") {
        row[colName] = val;
      }
    }
  }
  return row;
}
```
