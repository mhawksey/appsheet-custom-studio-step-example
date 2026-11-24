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
 * Creates an Error flagged as actionable (user-fixable configuration/input error).
 * @param {string} message - Human-readable error message.
 * @returns {Error} Error instance with isActionable = true.
 */
function createActionableError(message) {
  const err = new Error(message);
  err.isActionable = true;
  return err;
}

/**
 * A helper function to build the dedicated error response object using AddOnsResponseService.
 * @param {string} errorMessage - The error message to display in the log.
 * @param {boolean} [isActionable=false] - Whether the user can fix the error by updating step inputs.
 * @param {boolean} [isRetryable=false] - Whether Workspace Studio should automatically retry the step.
 * @returns {object} The error action object for Flows.
 */
function buildErrorResponse(errorMessage, isActionable = false, isRetryable = false) {
  const textElement = AddOnsResponseService.newTextFormatElement().setText(errorMessage);
  const textFormat = AddOnsResponseService.newWorkflowTextFormat().addTextFormatElement(textElement);
  const workflowAction = AddOnsResponseService.newReturnElementErrorAction()
    .setErrorActionability(
      isActionable
        ? AddOnsResponseService.ErrorActionability.ACTIONABLE
        : AddOnsResponseService.ErrorActionability.NOT_ACTIONABLE
    )
    .setErrorRetryability(
      isRetryable
        ? AddOnsResponseService.ErrorRetryability.RETRYABLE
        : AddOnsResponseService.ErrorRetryability.NOT_RETRYABLE
    )
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
      "hintText": "e.g., [{\"Column1\": \"Value A\", \"Notes\": \"\"\"{{variable}}\"\"\"}] (triple quotes optional for raw multiline/Markdown)",
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
      "hintText": "Must include key column. e.g., [{\"Key\": 1, \"Notes\": \"\"\"{{variable}}\"\"\"}] (triple quotes optional for raw multiline/Markdown)",
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
 * Strips an outer Markdown code fence (e.g. ```json ... ```) if the entire payload is wrapped in one.
 * @param {string} text - Trimmed input text.
 * @returns {string} Unwrapped text, or original text if not wrapped in a fence.
 */
function stripMarkdownCodeFences(text) {
  const match = text.match(/^```(?:[a-zA-Z0-9_-]*)?[ \t]*\r?\n([\s\S]*?)\r?\n?[ \t]*```$/);
  return match ? match[1].trim() : text;
}

/**
 * Advances past JSON structural whitespace (including NBSP and BOM from copy-paste).
 * @param {string} str - Input text.
 * @param {number} pos - Starting index.
 * @returns {number} Index of the next non-whitespace character, or str.length.
 */
function skipJsonWhitespace(str, pos) {
  let p = pos;
  while (p < str.length) {
    const ch = str[p];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\u00A0' || ch === '\uFEFF') {
      p++;
    } else {
      break;
    }
  }
  return p;
}

/**
 * Checks whether what immediately follows a primitive JSON value (number/boolean/null)
 * is structurally valid for the enclosing container.
 * @param {string} str - Input text.
 * @param {number} posAfterPrimitive - Index immediately after the primitive token.
 * @param {Array<string>} stack - Stack of open containers ('{' or '[').
 * @param {number} lookaheadBudget - Remaining recursive lookahead steps to guarantee O(1) work.
 * @returns {boolean} True if valid delimiter follows the primitive.
 */
function isValidPrimitiveFollow(str, posAfterPrimitive, stack, lookaheadBudget) {
  const after = skipJsonWhitespace(str, posAfterPrimitive);
  const container = stack.length > 0 ? stack[stack.length - 1] : null;
  if (container === null) {
    return after === str.length;
  }
  if (after >= str.length) return false;
  const ch = str[after];
  if (container === '{') {
    if (ch === '}') {
      return isValidAfterContainerClose(str, after + 1, stack, stack.length - 1);
    }
    if (ch === ',') {
      const afterComma = skipJsonWhitespace(str, after + 1);
      if (afterComma < str.length && str[afterComma] === '}') {
        return isValidAfterContainerClose(str, afterComma + 1, stack, stack.length - 1);
      }
      if (lookaheadBudget <= 0) return true;
      return isValidObjectKeyAhead(str, afterComma, stack, lookaheadBudget - 1);
    }
    return false;
  }
  if (container === '[') {
    if (ch === ']') {
      return isValidAfterContainerClose(str, after + 1, stack, stack.length - 1);
    }
    if (ch === ',') {
      const afterComma = skipJsonWhitespace(str, after + 1);
      if (afterComma < str.length && str[afterComma] === ']') {
        return isValidAfterContainerClose(str, afterComma + 1, stack, stack.length - 1);
      }
      if (lookaheadBudget <= 0) return true;
      return isValidJsonValueStart(str, afterComma, stack, lookaheadBudget - 1);
    }
    return false;
  }
  return false;
}

/**
 * Checks whether a valid JSON value starts at the next non-whitespace position.
 * @param {string} str - Input text.
 * @param {number} pos - Starting index.
 * @param {Array<string>} [stack] - Stack of open containers ('{' or '[').
 * @param {number} [lookaheadBudget=4] - Remaining recursive lookahead steps.
 * @returns {boolean} True if a valid JSON value token begins at pos.
 */
function isValidJsonValueStart(str, pos, stack = [], lookaheadBudget = 4) {
  const p = skipJsonWhitespace(str, pos);
  if (p >= str.length) return false;
  const ch = str[p];
  if (ch === '"' || ch === '{' || ch === '[') return true;
  if (ch === '-' || (ch >= '0' && ch <= '9')) {
    const numRe = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
    numRe.lastIndex = p;
    const match = numRe.exec(str);
    if (!match) return false;
    return isValidPrimitiveFollow(str, p + match[0].length, stack, lookaheadBudget);
  }
  if (str.startsWith('true', p) || str.startsWith('false', p) || str.startsWith('null', p)) {
    const wordLen = ch === 'f' ? 5 : 4;
    return isValidPrimitiveFollow(str, p + wordLen, stack, lookaheadBudget);
  }
  return false;
}

/**
 * Checks whether a plausible JSON object key ("Key": <value>) starts at pos.
 * @param {string} str - Input text.
 * @param {number} pos - Starting index.
 * @param {Array<string>} [stack] - Stack of open containers ('{' or '[').
 * @param {number} [lookaheadBudget=4] - Remaining recursive lookahead steps.
 * @returns {boolean} True if a single-line quoted key followed by ':' and a JSON value start is ahead.
 */
function isValidObjectKeyAhead(str, pos, stack = [], lookaheadBudget = 4) {
  let p = skipJsonWhitespace(str, pos);
  if (p >= str.length || str[p] !== '"') return false;
  p++; // skip opening quote of key
  while (p < str.length) {
    const ch = str[p];
    if (ch === '\\') {
      p += 2;
      continue;
    }
    if (ch === '\n' || ch === '\r') {
      return false;
    }
    if (ch === '"') {
      const afterKey = skipJsonWhitespace(str, p + 1);
      if (afterKey >= str.length || str[afterKey] !== ':') {
        return false;
      }
      return isValidJsonValueStart(str, afterKey + 1, stack, lookaheadBudget);
    }
    p++;
  }
  return false;
}

/**
 * Checks whether tokens after closing a container ('}' or ']') are structurally valid
 * for the enclosing parent container.
 * @param {string} str - Input text.
 * @param {number} pos - Index immediately after '}' or ']'.
 * @param {Array<string>} stack - Stack of open containers ('{' or '[').
 * @param {number} depth - Stack index of the container being closed.
 * @returns {boolean} True if what follows is valid for the parent container.
 */
function isValidAfterContainerClose(str, pos, stack, depth) {
  const p = skipJsonWhitespace(str, pos);
  const parent = depth > 0 ? stack[depth - 1] : null;
  if (parent === null) {
    return p === str.length;
  }
  if (p >= str.length) return false;
  const ch = str[p];
  const parentStack = stack.slice(0, depth);
  if (parent === '[') {
    if (ch === ']') {
      return isValidAfterContainerClose(str, p + 1, stack, depth - 1);
    }
    if (ch === ',') {
      const afterComma = skipJsonWhitespace(str, p + 1);
      if (afterComma < str.length && str[afterComma] === ']') {
        return isValidAfterContainerClose(str, afterComma + 1, stack, depth - 1);
      }
      return isValidJsonValueStart(str, afterComma, parentStack);
    }
    return false;
  }
  if (parent === '{') {
    if (ch === '}') {
      return isValidAfterContainerClose(str, p + 1, stack, depth - 1);
    }
    if (ch === ',') {
      const afterComma = skipJsonWhitespace(str, p + 1);
      if (afterComma < str.length && str[afterComma] === '}') {
        return isValidAfterContainerClose(str, afterComma + 1, stack, depth - 1);
      }
      return isValidObjectKeyAhead(str, afterComma, parentStack);
    }
    return false;
  }
  return false;
}

/**
 * Checks whether a candidate closing quote at posAfterQuote is followed by a valid
 * structural delimiter for the current JSON position.
 * @param {string} str - Input text.
 * @param {number} posAfterQuote - Index immediately after the closing quote (or triple quote).
 * @param {Array<string>} stack - Stack of open containers ('{' or '[').
 * @param {boolean} isKeyString - True if the string being closed is an object key.
 * @returns {boolean} True if this quote validly closes the current string.
 */
function isValidClosingDelimiter(str, posAfterQuote, stack, isKeyString) {
  const p = skipJsonWhitespace(str, posAfterQuote);
  if (isKeyString) {
    return p < str.length && str[p] === ':';
  }
  const container = stack.length > 0 ? stack[stack.length - 1] : null;
  if (container === null) {
    return p === str.length;
  }
  if (p >= str.length) return false;
  const ch = str[p];
  if (container === '{') {
    if (ch === ',') {
      const afterComma = skipJsonWhitespace(str, p + 1);
      if (afterComma < str.length && str[afterComma] === '}') {
        return isValidAfterContainerClose(str, afterComma + 1, stack, stack.length - 1);
      }
      return isValidObjectKeyAhead(str, afterComma, stack);
    }
    if (ch === '}') {
      return isValidAfterContainerClose(str, p + 1, stack, stack.length - 1);
    }
    return false;
  }
  if (container === '[') {
    if (ch === ']') {
      return isValidAfterContainerClose(str, p + 1, stack, stack.length - 1);
    }
    if (ch === ',') {
      const afterComma = skipJsonWhitespace(str, p + 1);
      if (afterComma < str.length && str[afterComma] === ']') {
        return isValidAfterContainerClose(str, afterComma + 1, stack, stack.length - 1);
      }
      return isValidJsonValueStart(str, afterComma, stack);
    }
    return false;
  }
  return false;
}

/**
 * Locates the matching closing triple quote (""") for a raw string value.
 * Verifies the closing delimiter structurally so embedded triple quotes or trailing
 * quotes inside the value do not prematurely end the block.
 * @param {string} str - Input text.
 * @param {number} startPos - Index immediately after the opening '"""'.
 * @param {Array<string>} stack - Stack of open containers ('{' or '[').
 * @returns {number} Start index of the closing '"""', or -1 if not found.
 */
function findTripleQuoteClose(str, startPos, stack) {
  let searchFrom = startPos;
  while (searchFrom < str.length) {
    const idx = str.indexOf('"""', searchFrom);
    if (idx === -1) return -1;
    if (isValidClosingDelimiter(str, idx + 3, stack, false)) {
      return idx;
    }
    searchFrom = idx + 1;
  }
  return -1;
}

/**
 * Repairs JSON payloads where Workspace Studio variable interpolation injected unescaped
 * newlines, tabs, control characters, double quotes, invalid backslash escapes (e.g. Markdown),
 * or optional triple-quoted raw strings ("""...""").
 * @param {string} text - Raw JSON-like string payload.
 * @returns {string} Repaired JSON string ready for JSON.parse().
 */
function repairJsonPayload(text) {
  let out = "";
  const stack = [];
  let expectingKey = false;
  let inString = false;
  let isKeyString = false;

  const len = text.length;
  let i = 0;

  while (i < len) {
    const ch = text[i];

    if (!inString) {
      if (ch === '\uFEFF') {
        i++;
        continue;
      }
      if (ch === '\u00A0') {
        out += ' ';
        i++;
        continue;
      }
      if (ch === '{') {
        stack.push('{');
        expectingKey = true;
        out += ch;
        i++;
        continue;
      }
      if (ch === '[') {
        stack.push('[');
        expectingKey = false;
        out += ch;
        i++;
        continue;
      }
      if (ch === '}' || ch === ']') {
        if (stack.length > 0) stack.pop();
        expectingKey = false;
        out += ch;
        i++;
        continue;
      }
      if (ch === ':') {
        expectingKey = false;
        out += ch;
        i++;
        continue;
      }
      if (ch === ',') {
        const nextNonWs = skipJsonWhitespace(text, i + 1);
        if (nextNonWs < len && (text[nextNonWs] === '}' || text[nextNonWs] === ']')) {
          i++;
          continue;
        }
        expectingKey = stack.length > 0 && stack[stack.length - 1] === '{';
        out += ch;
        i++;
        continue;
      }
      if (ch === '"') {
        // Optional triple-quoted raw string support for values: """..."""
        if (!expectingKey && text.startsWith('"""', i)) {
          const closeIdx = findTripleQuoteClose(text, i + 3, stack);
          if (closeIdx !== -1) {
            const rawContent = text.slice(i + 3, closeIdx);
            out += JSON.stringify(rawContent);
            i = closeIdx + 3;
            continue;
          }
        }
        inString = true;
        isKeyString = expectingKey;
        out += '"';
        i++;
        continue;
      }

      out += ch;
      i++;
      continue;
    }

    // Inside a JSON string
    const code = ch.charCodeAt(0);

    // Escape raw control characters (U+0000 - U+001F), including newlines and tabs
    if (code < 0x20) {
      switch (ch) {
        case '\n': out += '\\n'; break;
        case '\r': out += '\\r'; break;
        case '\t': out += '\\t'; break;
        case '\b': out += '\\b'; break;
        case '\f': out += '\\f'; break;
        default: out += '\\u' + code.toString(16).padStart(4, '0'); break;
      }
      i++;
      continue;
    }

    // Handle backslash escape sequences
    if (ch === '\\') {
      if (i + 1 >= len) {
        out += '\\\\';
        i++;
        continue;
      }
      const next = text[i + 1];
      if (next === '"') {
        // Distinguish intentional \" inside text from a literal trailing \ right before closing "
        if (isValidClosingDelimiter(text, i + 2, stack, isKeyString)) {
          out += '\\\\';
          i++;
          continue;
        }
        out += '\\"';
        i += 2;
        continue;
      }
      if (next === '\\' || next === '/' || next === 'b' || next === 'f' || next === 'n' || next === 'r' || next === 't') {
        out += '\\' + next;
        i += 2;
        continue;
      }
      if (next === 'u' && /^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))) {
        out += text.slice(i, i + 6);
        i += 6;
        continue;
      }
      // Invalid JSON escape (e.g. Markdown \#, \*, \_, or Windows paths C:\Users)
      out += '\\\\';
      i++;
      continue;
    }

    // Handle double quote inside string: only close if structurally valid
    if (ch === '"') {
      if (isValidClosingDelimiter(text, i + 1, stack, isKeyString)) {
        inString = false;
        if (isKeyString) expectingKey = false;
        isKeyString = false;
        out += '"';
      } else {
        out += '\\"';
      }
      i++;
      continue;
    }

    out += ch;
    i++;
  }

  return out;
}

/**
 * Validates and normalizes parsed JSON row data into an array of plain row objects.
 * Accepts either an array of row objects or a single row object (automatically wrapped).
 * @param {*} parsed - Parsed JSON value.
 * @param {string} fieldLabel - Display label for error diagnostics.
 * @returns {Array<object>} Normalized array of row objects.
 */
function normalizeParsedRows(parsed, fieldLabel) {
  if (Array.isArray(parsed)) {
    const allValidObjects = parsed.every(item => item !== null && typeof item === 'object' && !Array.isArray(item));
    if (!allValidObjects) {
      throw createActionableError(
        `Invalid '${fieldLabel}': expected a JSON array of row objects (e.g., [{"Column": "Value"}]).`
      );
    }
    return parsed;
  }

  if (parsed !== null && typeof parsed === 'object') {
    return [parsed];
  }

  throw createActionableError(
    `Invalid '${fieldLabel}': expected a JSON array of row objects (e.g., [{"Column": "Value"}]).`
  );
}

/**
 * Resiliently parses JSON row payloads from Workspace Studio inputs.
 * 1. Tries strict JSON.parse() first (zero alteration for valid JSON).
 * 2. Strips optional Markdown code fences (e.g. ```json ... ```).
 * 3. Repairs unescaped newlines, tabs, quotes, invalid backslash escapes, trailing commas,
 *    and optional triple-quoted raw strings ("""...""").
 * 4. Normalizes single row objects ({...}) into single-element arrays ([{...}]).
 * @param {string} rawInput - Raw input string from Studio.
 * @param {string} [fieldLabel="rowsData"] - Field name for error messages.
 * @returns {Array<object>} Parsed and normalized array of row objects.
 */
function parseRowsData(rawInput, fieldLabel = "rowsData") {
  if (!rawInput || typeof rawInput !== "string") {
    return [];
  }

  const trimmed = rawInput.trim();
  if (!trimmed) {
    return [];
  }

  // Stage 1: Fast path for already-valid JSON
  try {
    return normalizeParsedRows(JSON.parse(trimmed), fieldLabel);
  } catch (strictErr) {
    if (strictErr && strictErr.isActionable) {
      throw strictErr;
    }
  }

  // Stage 2: Unwrap optional Markdown code fences (e.g. Gemini JSON block)
  const unfenced = stripMarkdownCodeFences(trimmed);
  if (unfenced !== trimmed) {
    try {
      return normalizeParsedRows(JSON.parse(unfenced), fieldLabel);
    } catch (fenceErr) {
      if (fenceErr && fenceErr.isActionable) {
        throw fenceErr;
      }
    }
  }

  // Stage 3: Stateful string & triple-quote repair pass
  try {
    const repaired = repairJsonPayload(unfenced);
    return normalizeParsedRows(JSON.parse(repaired), fieldLabel);
  } catch (repairErr) {
    if (repairErr && repairErr.isActionable) {
      throw repairErr;
    }
    throw createActionableError(
      `Invalid JSON in '${fieldLabel}': ${repairErr.message}. Tip: Verify brackets/commas, or wrap multiline/complex variable values in triple quotes ("""...""").`
    );
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
    const err = new Error("No response returned from AppSheet API.");
    err.isRetryable = true;
    throw err;
  }

  if (response instanceof Error) {
    const err = new Error(`AppSheet API network or parse error: ${response.message}`);
    err.isRetryable = true;
    throw err;
  }

  // AppSheet Problem Details or library errors: { detail, Error, title, message, status }
  if (response.Error || response.detail) {
    const detailMsg = response.detail || response.Error;
    const title = response.title ? `[${response.title}] ` : "";
    const responseBody = response.ResponseBody ? ` | Body: ${response.ResponseBody}` : "";
    const err = new Error(`AppSheet API error: ${title}${detailMsg}${responseBody}`);
    const status = Number(response.status);
    if (status === 429 || (status >= 500 && status < 600)) {
      err.isRetryable = true;
    } else if (status >= 400 && status < 500) {
      err.isActionable = true;
    }
    throw err;
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
      throw createActionableError("Missing required inputs: 'App ID', 'Access Key', and 'Table Name' must all be provided.");
    }

    let rows = [];
    const rowsDataInput = inputs.rowsData?.stringValues?.[0]?.trim();

    if (rowsDataInput) {
      rows = parseRowsData(rowsDataInput, "Rows to Add");
    } else {
      const dynamicRow = extractDynamicRowInputs(inputs);
      if (dynamicRow) {
        rows = [dynamicRow];
      }
    }

    if (!rows || rows.length === 0) {
      throw createActionableError("No row data supplied. Provide JSON in 'rowsData' or configure column fields.");
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
    return buildErrorResponse(
      `Failed to add rows. Error: ${e.message || e.toString()}`,
      Boolean(e && e.isActionable),
      Boolean(e && e.isRetryable)
    );
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
      throw createActionableError("Missing required inputs: 'App ID', 'Access Key', and 'Table Name' must all be provided.");
    }

    let rows = [];
    const rowsDataInput = inputs.rowsData?.stringValues?.[0]?.trim();

    if (rowsDataInput) {
      rows = parseRowsData(rowsDataInput, "Rows to Update");
    } else {
      const dynamicRow = extractDynamicRowInputs(inputs);
      if (dynamicRow) {
        rows = [dynamicRow];
      }
    }

    if (!rows || rows.length === 0) {
      throw createActionableError("No row data supplied. Provide JSON in 'rowsData' or configure column fields.");
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
    return buildErrorResponse(
      `Failed to update rows. Error: ${e.message || e.toString()}`,
      Boolean(e && e.isActionable),
      Boolean(e && e.isRetryable)
    );
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
      throw createActionableError("Missing required inputs: 'App ID', 'Access Key', and 'Table Name' must all be provided.");
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
      rows = parseRowsData(rowsData, "Row Keys to Find");
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
    return buildErrorResponse(
      `Failed to find rows. Error: ${e.message || e.toString()}`,
      Boolean(e && e.isActionable),
      Boolean(e && e.isRetryable)
    );
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
