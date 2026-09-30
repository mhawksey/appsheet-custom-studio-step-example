# Configuration Card UI Guide

The configuration card allows workflow creators in Google Workspace Studio to configure step inputs, choose static values, or map dynamic variables from previous flow steps.

## Card Architecture

The function specified in `onConfigFunction` can return:
1. A standard `CardService.Card` object.
2. An `AddOnsResponseService.RenderAction` wrapping host navigation actions.
3. A raw JSON action payload.

---

## 1. Enabling Variable Binding (`includeVariables`)

To allow users to map preceding step variables (chips) into input fields, you **must** configure the widget data source:

```javascript
function onConfigAddRows(e) {
  const section = CardService.newCardSection()
    .setHeader("AppSheet Configuration");

  // Workflow Data Source that enables the chip / variable picker
  const workflowDataSource = CardService.newWorkflowDataSource()
    .setIncludeVariables(true);

  const hostAppDataSource = CardService.newHostAppDataSource()
    .setWorkflowDataSource(workflowDataSource);

  // App ID Text Input with Variable Support
  const appIdInput = CardService.newTextInput()
    .setId("appId")
    .setFieldName("appId")
    .setTitle("AppSheet App ID")
    .setHint("Enter or select your AppSheet App ID")
    .setHostAppDataSource(hostAppDataSource);

  // Table Name Input
  const tableInput = CardService.newTextInput()
    .setId("tableName")
    .setFieldName("tableName")
    .setTitle("Table Name")
    .setHint("Target table in AppSheet")
    .setHostAppDataSource(hostAppDataSource);

  section.addWidget(appIdInput);
  section.addWidget(tableInput);

  return CardService.newCardBuilder()
    .addSection(section)
    .build();
}
```

---

## 2. Interactive Card Updates (`update_card` / `replaceSection`)

When a user selects a value (like an AppSheet Table) and you want to fetch and display the table's columns dynamically:

```javascript
function onFetchTableFields(e) {
  const formInputs = e.commonEventObject.formInputs;
  const appId = formInputs.appId?.stringInputs?.value?.[0];
  const tableName = formInputs.tableName?.stringInputs?.value?.[0];

  // Fetch columns from AppSheet
  const appSheet = new AppSheetApp(appId, getAccessKey());
  const columns = appSheet.getColumnNames(tableName);

  // Build replacement section with fields for each column
  const dynamicSection = CardService.newCardSection()
    .setHeader(`Columns for ${tableName}`);

  const workflowDataSource = CardService.newWorkflowDataSource().setIncludeVariables(true);
  const hostAppDataSource = CardService.newHostAppDataSource().setWorkflowDataSource(workflowDataSource);

  columns.forEach(col => {
    dynamicSection.addWidget(
      CardService.newTextInput()
        .setId(`col_${col}`)
        .setFieldName(`col_${col}`)
        .setTitle(col)
        .setHostAppDataSource(hostAppDataSource)
    );
  });

  // Return update action
  return AddOnsResponseService.newRenderActionBuilder()
    .setHostAppAction(
      AddOnsResponseService.newHostAppAction()
        .setCardAction(
          AddOnsResponseService.newCardAction()
            .setUpdateCard(
              CardService.newCardBuilder()
                .addSection(buildStaticSection())
                .addSection(dynamicSection)
                .build()
            )
        )
    )
    .build();
}
```

---

## 3. Save Button / Host Action

In Workspace Studio, the flow builder provides a native **Save** button in the sidebar footer. When custom buttons are required inside the card body:

```javascript
const saveAction = CardService.newAction()
  .setFunctionName("onSaveConfig");

const saveButton = CardService.newTextButton()
  .setText("Confirm Settings")
  .setOnClickAction(saveAction);
```

Or using the Studio JSON host app action:
```json
{
  "hostAppAction": {
    "workflowAction": {
      "saveWorkflowAction": {}
    }
  }
}
```
