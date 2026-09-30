/**
 * @file Code.gs
 * @description Main logic for the AppSheet Google Workspace Flows add-on.
 */

/**
 * A helper function to build a consistent configuration card for all steps.
 * @param {string} title - The header for the card section.
 * @param {Array<object>} additionalWidgets - An array of extra widgets specific to the step.
 * @returns {object} A card object for the flow.
 */
function buildConfigurationCard(title, additionalWidgets = []) {
  const card = {
    "sections": [{
      "id": "main_config_section",
      "header": title,
      "widgets": [{
          "textInput": {
            "name": "appId",
            "label": "AppSheet App ID",
            "hintText": "Enter the ID of your AppSheet app.",
            "hostAppDataSource": { "workflowDataSource": { "includeVariables": false } }
          }
        },
        {
          "textInput": {
            "name": "accessKey",
            "label": "Application Access Key",
            "hintText": "Enter a valid access key for your app.",
            "hostAppDataSource": { "workflowDataSource": { "includeVariables": false } }
          }
        },
        {
          "textInput": {
            "name": "tableName",
            "label": "Table Name",
            "hintText": "Enter the exact name of the target table.",
            "hostAppDataSource": { "workflowDataSource": { "includeVariables": true } }
          }
        },
        // Add any step-specific widgets
        ...additionalWidgets
      ]
    }]
  };

  return { "action": { "navigations": [{ "push_card": card }] } };
}

/**
 * Dynamically fetches table columns from AppSheet and updates the configuration card.
 * @param {object} event - The configuration card event object.
 * @returns {object} Render action to update the card.
 */
function onFetchTableFields(event) {
  try {
    const inputs = event.formInputs || {};
    const appId = inputs.appId ? inputs.appId[0] : "";
    const accessKey = inputs.accessKey ? inputs.accessKey[0] : "";
    const tableName = inputs.tableName ? inputs.tableName[0] : "";

    if (!appId || !accessKey || !tableName) {
      throw new Error("Please fill in App ID, Access Key, and Table Name before fetching fields.");
    }

    const AppSheet = new AppSheetApp(appId, accessKey);
    const result = AppSheet.Find(tableName, [], { "Selector": "TOP(FILTER(\"" + tableName + "\", TRUE), 1)" });

    if (result && (result.Error || result.detail)) {
      throw new Error(result.detail || result.Error);
    }

    let columns = [];
    if (Array.isArray(result) && result.length > 0) {
      columns = Object.keys(result[0]);
    }

    const dynamicWidgets = columns.map(colName => ({
      "textInput": {
        "name": "field_" + colName,
        "label": colName,
        "hintText": "Value or variable for " + colName,
        "hostAppDataSource": { "workflowDataSource": { "includeVariables": true } }
      }
    }));

    const updatedSection = {
      "id": "main_config_section",
      "header": "Configure Fields for '" + tableName + "'",
      "widgets": [
        {
          "textInput": {
            "name": "appId",
            "label": "AppSheet App ID",
            "value": appId,
            "hostAppDataSource": { "workflowDataSource": { "includeVariables": false } }
          }
        },
        {
          "textInput": {
            "name": "accessKey",
            "label": "Application Access Key",
            "value": accessKey,
            "hostAppDataSource": { "workflowDataSource": { "includeVariables": false } }
          }
        },
        {
          "textInput": {
            "name": "tableName",
            "label": "Table Name",
            "value": tableName,
            "hostAppDataSource": { "workflowDataSource": { "includeVariables": true } }
          }
        },
        {
          "buttonSet": {
            "buttons": [{
              "text": "Refresh Table Fields",
              "onClick": {
                "action": {
                  "function": "onFetchTableFields"
                }
              }
            }]
          }
        },
        ...dynamicWidgets
      ]
    };

    const modifyAction = AddOnsResponseService.newAction()
      .addModifyCard(
        AddOnsResponseService.newModifyCard().setReplaceSection(updatedSection)
      );

    return AddOnsResponseService.newRenderActionBuilder()
      .setAction(modifyAction)
      .build();

  } catch (err) {
    return buildErrorResponse("Failed to fetch table fields: " + err.toString());
  }
}

/**
 * A helper function to build the dedicated error response object using AddOnsResponseService.
 * @param {string} errorMessage - The error message to display in the log.
 * @returns {object} The error action object for Flows.
 */
function buildErrorResponse(errorMessage) {
  const textElement = AddOnsResponseService.newTextFormatElement().setText(errorMessage);
  const textFormat = AddOnsResponseService.newWorkflowTextFormat().addTextFormatElement(textElement);
  const workflowAction = AddOnsResponseService.newReturnElementErrorAction()
    .setErrorActionability(AddOnsResponseService.ErrorActionability.NOT_ACTIONABLE)
    .setErrorRetryability(AddOnsResponseService.ErrorRetryability.NOT_RETRYABLE)
    .setErrorLog(textFormat);

  const hostAppAction = AddOnsResponseService.newHostAppAction()
    .setWorkflowAction(workflowAction);

  return AddOnsResponseService.newRenderActionBuilder()
    .setHostAppAction(hostAppAction)
    .build();
}

/**
 * Builds the configuration card for the "Add Rows" step.
 * @returns {object} A configuration card.
 */
function onConfigAddRows() {
  const widgets = [{
    "textInput": {
      "name": "rowsData",
      "label": "Rows to Add (JSON format - Optional if dynamic fields are used)",
      "hintText": "e.g., [{\"Column1\": \"Value A\"}, {\"Column1\": \"{{a_variable}}\"}]",
      "hostAppDataSource": { "workflowDataSource": { "includeVariables": true } },
      "type": "MULTIPLE_LINE"
    }
  }];
  return buildConfigurationCard("Configure 'Add Rows'", widgets);
}

/**
 * Builds the configuration card for the "Update Rows" step.
 * @returns {object} A configuration card.
 */
function onConfigUpdateRows() {
  const widgets = [{
    "textInput": {
      "name": "rowsData",
      "label": "Rows to Update (JSON format - Optional if dynamic fields are used)",
      "hintText": "Each object must contain the table's key. e.g., [{\"KeyColumn\": 1, \"DataColumn\": \"New Value\"}]",
      "hostAppDataSource": { "workflowDataSource": { "includeVariables": true } },
      "type": "MULTIPLE_LINE"
    }
  }];
  return buildConfigurationCard("Configure 'Update Rows'", widgets);
}

/**
 * Builds the configuration card for the "Find Rows" step.
 * @returns {object} A configuration card.
 */
function onConfigFindRows() {
  const widgets = [{
      "textInput": {
        "name": "selector",
        "label": "Selector Expression (Optional)",
        "hintText": "e.g., FILTER(\"MyTable\", [Status]=\"Open\")",
        "hostAppDataSource": { "workflowDataSource": { "includeVariables": true } }
      }
    },
    {
      "textInput": {
        "name": "rowsData",
        "label": "Row Keys to Find (Optional, JSON format)",
        "hintText": "Use instead of Selector. e.g., [{\"KeyColumn\": \"KeyValue1\"}]",
        "hostAppDataSource": { "workflowDataSource": { "includeVariables": true } },
        "type": "MULTIPLE_LINE"
      }
    }
  ];
  return buildConfigurationCard("Configure 'Find Rows'", widgets);
}

/**
 * A helper function to format and return output variables from a step.
 * Supports a variableDataMap (object mapping variableId -> VariableData or raw values)
 * or legacy variableValues array.
 * @param {Object.<string, AddOnsResponseService.VariableData>|Array<object>} variables - Output variable data map or array.
 * @param {string} logMessage - A message to write to the Activity log.
 * @returns {object} The render action object for Flows.
 */
function returnOutputVariables(variables, logMessage) {
  const workflowAction = AddOnsResponseService.newReturnOutputVariablesAction();

  if (Array.isArray(variables)) {
    variables.forEach(item => {
      const varId = item.variableId;
      const varData = item.variableData;
      if (varData && typeof varData.addStringValue === 'function') {
        workflowAction.addVariableData(varId, varData);
      } else {
        const v = AddOnsResponseService.newVariableData();
        if (varData.stringValues) {
          varData.stringValues.forEach(str => v.addStringValue(str));
        } else if (varData.integerValues) {
          varData.integerValues.forEach(num => v.addIntegerValue(num));
        } else if (varData.resourceReferences) {
          varData.resourceReferences.forEach(ref => v.addResourceReference(ref.resourceId));
        }
        workflowAction.addVariableData(varId, v);
      }
    });
  } else if (variables && typeof variables === 'object') {
    for (const key in variables) {
      workflowAction.addVariableData(key, variables[key]);
    }
  }

  if (logMessage) {
    const textElement = AddOnsResponseService.newTextFormatElement().setText(logMessage);
    const textFormat = AddOnsResponseService.newWorkflowTextFormat().addTextFormatElement(textElement);
    workflowAction.setLog(textFormat);
  }

  const hostAppAction = AddOnsResponseService.newHostAppAction()
    .setWorkflowAction(workflowAction);

  return AddOnsResponseService.newRenderActionBuilder()
    .setHostAppAction(hostAppAction)
    .build();
}

/**
 * Helper to construct a row payload from individually configured dynamic field inputs.
 * @param {object} inputs - The event inputs object.
 * @returns {object|null} Constructed row object or null if no dynamic field inputs exist.
 */
function extractDynamicRowInputs(inputs) {
  const row = {};
  let hasDynamicField = false;

  for (const key in inputs) {
    if (key.indexOf("field_") === 0) {
      const colName = key.substring(6);
      const val = inputs[key]?.stringValues?.[0];
      if (val !== undefined && val !== "") {
        row[colName] = val;
        hasDynamicField = true;
      }
    }
  }

  return hasDynamicField ? row : null;
}

/**
 * Safely caches a row object in CacheService, enforcing the 100 KB limit.
 * @param {string} resourceId - The cache key.
 * @param {object} rowData - The row data object to serialize and cache.
 * @param {number} [ttlSeconds=21600] - Time to live in seconds (default 6 hours).
 */
function safeCacheRow(resourceId, rowData, ttlSeconds = 21600) {
  if (!rowData || !resourceId) return;
  try {
    const serialized = JSON.stringify(rowData);
    // CacheService limit is 100 KB (102,400 bytes). Reserve safety margin at 100,000 bytes.
    if (serialized.length < 100000) {
      CacheService.getScriptCache().put(resourceId, serialized, ttlSeconds);
    } else {
      console.warn(`Row payload for ${resourceId} exceeds CacheService 100KB limit (${serialized.length} bytes). Skipping cache.`);
    }
  } catch (err) {
    console.warn(`Failed to cache row ${resourceId}: ${err.toString()}`);
  }
}

/**
 * Checks an AppSheet API response for errors and throws if invalid.
 * Handles HTTP Problem Details (RFC 7807/9110), JS Error objects, and library errors.
 * @param {object} response - The raw response from AppSheetApp.
 * @param {string} expectedType - Expected format ('rows_property' for Add/Edit, 'array' for Find).
 */
function validateAppSheetResponse(response, expectedType) {
  if (!response) {
    throw new Error("No response returned from AppSheet API.");
  }

  if (response instanceof Error) {
    throw new Error(`AppSheet API network or parse error: ${response.message}`);
  }

  // AppSheet Problem Details or library errors: { detail, Error, title, message }
  if (response.Error || response.detail) {
    const detailMsg = response.detail || response.Error;
    const title = response.title ? `[${response.title}] ` : "";
    const responseBody = response.ResponseBody ? ` | Body: ${response.ResponseBody}` : "";
    throw new Error(`AppSheet API error: ${title}${detailMsg}${responseBody}`);
  }

  if (expectedType === 'array' && !Array.isArray(response)) {
    const errorDetail = response.detail || response.Error || response.message || response.title || JSON.stringify(response);
    throw new Error(`AppSheet API error: ${errorDetail}`);
  }

  if (expectedType === 'rows_property' && !response.Rows && !Array.isArray(response)) {
    const errorDetail = response.detail || response.Error || response.message || response.title || JSON.stringify(response);
    throw new Error(`AppSheet API error: ${errorDetail}`);
  }
}

/**
 * Executes the "Add Rows" step.
 * @param {object} event - The flow event object.
 * @returns {object} An action response with output variables.
 */
function onExecuteAddRows(event) {
  try {
    const inputs = event?.workflow?.actionInvocation?.inputs || {};
    const appId = inputs.appId?.stringValues?.[0]?.trim();
    const accessKey = inputs.accessKey?.stringValues?.[0]?.trim();
    const tableName = inputs.tableName?.stringValues?.[0]?.trim();

    if (!appId || !accessKey || !tableName) {
      throw new Error("Missing required inputs: 'App ID', 'Access Key', and 'Table Name' must all be provided.");
    }

    let rows = [];
    const rowsDataInput = inputs.rowsData?.stringValues?.[0]?.trim();

    if (rowsDataInput) {
      rows = JSON.parse(rowsDataInput);
    } else {
      const dynamicRow = extractDynamicRowInputs(inputs);
      if (dynamicRow) {
        rows = [dynamicRow];
      }
    }

    if (!rows || rows.length === 0) {
      throw new Error("No row data supplied. Provide JSON in 'rowsData' or configure column fields.");
    }

    const AppSheet = new AppSheetApp(appId, accessKey);
    const response = AppSheet.Add(tableName, rows);

    validateAppSheetResponse(response, 'rows_property');

    const addedRows = response?.Rows || [];
    const resourceId = "row_add_" + Utilities.getUuid();
    const firstRowData = (addedRows.length > 0) ? addedRows[0] : (rows.length > 0 ? rows[0] : null);
    safeCacheRow(resourceId, firstRowData);

    const variables = {
      "addedRow": AddOnsResponseService.newVariableData().addResourceReference(resourceId),
      "addedRows": AddOnsResponseService.newVariableData().addStringValue(JSON.stringify(addedRows, null, 2))
    };
    const logMessage = `Successfully added ${addedRows.length} row(s) to '${tableName}'.`;

    return returnOutputVariables(variables, logMessage);

  } catch (e) {
    return buildErrorResponse(`Failed to add rows. Error: ${e.toString()}`);
  }
}

/**
 * Executes the "Update Rows" step.
 * @param {object} event - The flow event object.
 * @returns {object} An action response with output variables.
 */
function onExecuteUpdateRows(event) {
  try {
    const inputs = event?.workflow?.actionInvocation?.inputs || {};
    const appId = inputs.appId?.stringValues?.[0]?.trim();
    const accessKey = inputs.accessKey?.stringValues?.[0]?.trim();
    const tableName = inputs.tableName?.stringValues?.[0]?.trim();

    if (!appId || !accessKey || !tableName) {
      throw new Error("Missing required inputs: 'App ID', 'Access Key', and 'Table Name' must all be provided.");
    }

    let rows = [];
    const rowsDataInput = inputs.rowsData?.stringValues?.[0]?.trim();

    if (rowsDataInput) {
      rows = JSON.parse(rowsDataInput);
    } else {
      const dynamicRow = extractDynamicRowInputs(inputs);
      if (dynamicRow) {
        rows = [dynamicRow];
      }
    }

    if (!rows || rows.length === 0) {
      throw new Error("No row data supplied. Provide JSON in 'rowsData' or configure column fields.");
    }

    const AppSheet = new AppSheetApp(appId, accessKey);
    const response = AppSheet.Edit(tableName, rows);

    validateAppSheetResponse(response, 'rows_property');

    const updatedRows = response?.Rows || rows;
    const resourceId = "row_update_" + Utilities.getUuid();
    if (updatedRows.length > 0) {
      safeCacheRow(resourceId, updatedRows[0]);
    }

    const variables = {
      "updatedRow": AddOnsResponseService.newVariableData().addResourceReference(resourceId),
      "updatedRows": AddOnsResponseService.newVariableData().addStringValue(JSON.stringify(updatedRows, null, 2))
    };
    const logMessage = `Successfully submitted ${rows.length} row(s) for update in '${tableName}'.`;

    return returnOutputVariables(variables, logMessage);

  } catch (e) {
    return buildErrorResponse(`Failed to update rows. Error: ${e.toString()}`);
  }
}

/**
 * Executes the "Find Rows" step.
 * @param {object} event - The flow event object.
 * @returns {object} An action response with output variables.
 */
function onExecuteFindRows(event) {
  try {
    const inputs = event?.workflow?.actionInvocation?.inputs || {};
    const appId = inputs.appId?.stringValues?.[0]?.trim();
    const accessKey = inputs.accessKey?.stringValues?.[0]?.trim();
    const tableName = inputs.tableName?.stringValues?.[0]?.trim();

    if (!appId || !accessKey || !tableName) {
      throw new Error("Missing required inputs: 'App ID', 'Access Key', and 'Table Name' must all be provided.");
    }

    const selector = inputs.selector?.stringValues?.[0]?.trim();
    const rowsData = inputs.rowsData?.stringValues?.[0]?.trim();

    const AppSheet = new AppSheetApp(appId, accessKey);

    let properties = null;
    if (selector && selector !== "") {
      properties = { "Selector": selector };
    }

    let rows = [];
    if (rowsData && rowsData !== "") {
      try {
        const parsed = JSON.parse(rowsData);
        if (Array.isArray(parsed)) {
          rows = parsed;
        }
      } catch (err) {
        throw new Error(`Invalid JSON in 'Row Keys to Find': ${err.message}`);
      }
    }

    const response = AppSheet.Find(tableName, rows, properties);

    validateAppSheetResponse(response, 'array');

    const foundRows = response;
    const resourceId = "row_find_" + Utilities.getUuid();
    if (foundRows.length > 0) {
      safeCacheRow(resourceId, foundRows[0]);
    }

    const variables = {
      "firstRow": AddOnsResponseService.newVariableData().addResourceReference(resourceId),
      "foundRows": AddOnsResponseService.newVariableData().addStringValue(JSON.stringify(foundRows, null, 2)),
      "rowCount": AddOnsResponseService.newVariableData().addIntegerValue(foundRows.length)
    };
    const logMessage = `Successfully found ${foundRows.length} rows in '${tableName}'.`;

    return returnOutputVariables(variables, logMessage);

  } catch (e) {
    return buildErrorResponse(`Failed to find rows. Error: ${e.toString()}`);
  }
}

/**
 * Dynamic Resource Definition Provider for AppSheet Row fields.
 * Invoked by Google Workspace Studio when configuring steps with dynamic output resources.
 * Introspects table columns from AppSheet and registers them as individual ResourceFields.
 * @param {object} e - The dynamic definition event object.
 * @returns {object} The render action with dynamic resource definitions.
 */
function onDynamicAppSheetRowDefinition(e) {
  console.log("Payload in onDynamicAppSheetRowDefinition: " + JSON.stringify(e));

  const resourceDefinitions = AddOnsResponseService.newDynamicResourceDefinition()
    .setResourceId("appsheet_row_resource");

  try {
    const retrieval = e?.workflow?.resourceFieldsDefinitionRetrieval;
    const inputs = retrieval?.inputs || {};

    const appId = inputs.appId?.stringValues?.[0]?.trim();
    const accessKey = inputs.accessKey?.stringValues?.[0]?.trim();
    const tableName = inputs.tableName?.stringValues?.[0]?.trim();

    if (appId && accessKey && tableName) {
      const cacheKey = "schema_" + appId + "_" + tableName;
      let columns = null;

      const cached = CacheService.getScriptCache().get(cacheKey);
      if (cached) {
        try {
          columns = JSON.parse(cached);
        } catch (err) {
          columns = null;
        }
      }

      if (!columns || !Array.isArray(columns) || columns.length === 0) {
        const AppSheet = new AppSheetApp(appId, accessKey);
        // Try reading 1 sample row using TOP 1 to inspect column names
        const sampleRows = AppSheet.Find(tableName, [], { "Selector": `TOP(FILTER("${tableName}", TRUE), 1)` });
        if (Array.isArray(sampleRows) && sampleRows.length > 0) {
          columns = Object.keys(sampleRows[0]);
        } else {
          // Fallback: query without selector
          const allRows = AppSheet.Find(tableName, [], null);
          if (Array.isArray(allRows) && allRows.length > 0) {
            columns = Object.keys(allRows[0]);
          }
        }

        if (columns && Array.isArray(columns) && columns.length > 0) {
          CacheService.getScriptCache().put(cacheKey, JSON.stringify(columns), 21600);
        }
      }

      if (columns && Array.isArray(columns)) {
        columns.forEach(colName => {
          resourceDefinitions.addResourceField(
            AddOnsResponseService.newResourceField()
              .setSelector(colName)
              .setDisplayText(colName)
          );
        });
      }
    }
  } catch (err) {
    console.error("Error in onDynamicAppSheetRowDefinition: " + err.toString());
  }

  const workflowAction = AddOnsResponseService.newResourceFieldsDefinitionRetrievedAction()
    .addDynamicResourceDefinition(resourceDefinitions);

  const hostAppAction = AddOnsResponseService.newHostAppAction()
    .setWorkflowAction(workflowAction);

  return AddOnsResponseService.newRenderActionBuilder()
    .setHostAppAction(hostAppAction)
    .build();
}

/**
 * Dynamic Resource Provider for AppSheet Row fields.
 * Invoked by Google Workspace Studio when a downstream step references a dynamic row variable chip.
 * Retrieves the cached row data by resourceId and populates the variable data for each column.
 * @param {object} e - The resource retrieval event object.
 * @returns {object} The render action containing the retrieved resource data.
 */
function onDynamicAppSheetRowProvider(e) {
  console.log("Payload in onDynamicAppSheetRowProvider: " + JSON.stringify(e));

  const resourceId = e?.workflow?.resourceRetrieval?.resourceReference?.resourceId;
  const resourceData = AddOnsResponseService.newResourceData();

  if (resourceId) {
    const cached = CacheService.getScriptCache().get(resourceId);
    if (cached) {
      try {
        const rowData = JSON.parse(cached);
        for (const key in rowData) {
          const val = rowData[key];
          const stringVal = (val === null || val === undefined) ? "" : (typeof val === 'object' ? JSON.stringify(val) : String(val));
          resourceData.addVariableData(
            key,
            AddOnsResponseService.newVariableData().addStringValue(stringVal)
          );
        }
      } catch (err) {
        console.error("Error parsing cached row in onDynamicAppSheetRowProvider: " + err.toString());
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
