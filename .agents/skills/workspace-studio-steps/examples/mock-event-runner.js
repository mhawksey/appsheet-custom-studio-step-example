/**
 * Mock Event Runner for Google Workspace Studio Custom Steps.
 * 
 * Use this helper to test `onExecuteFunction` handlers locally or in the Apps Script
 * editor without needing to trigger a full flow in Google Workspace Studio.
 */

/**
 * Builds a compliant Workspace Studio actionInvocation event object.
 * @param {object} inputsMap - Key-value map of input parameters.
 * @returns {object} Mock event object matching Studio runtime specification.
 */
function createMockStudioEvent(inputsMap) {
  const structuredInputs = {};

  for (const [key, value] of Object.entries(inputsMap)) {
    if (typeof value === "string") {
      structuredInputs[key] = { "stringValues": [value] };
    } else if (typeof value === "number") {
      if (Number.isInteger(value)) {
        structuredInputs[key] = { "integerValues": [value] };
      } else {
        structuredInputs[key] = { "doubleValues": [value] };
      }
    } else if (typeof value === "boolean") {
      structuredInputs[key] = { "booleanValues": [value] };
    } else if (Array.isArray(value)) {
      structuredInputs[key] = { "stringValues": value.map(v => String(v)) };
    } else if (typeof value === "object" && value !== null) {
      structuredInputs[key] = { "stringValues": [JSON.stringify(value)] };
    }
  }

  return {
    "workflow": {
      "triggerEventSource": "TRIGGER_EVENT_SOURCE_AUTOMATED",
      "actionInvocation": {
        "inputs": structuredInputs
      }
    },
    "userLocale": "en",
    "hostApp": "flows",
    "clientPlatform": "web",
    "commonEventObject": {
      "timeZone": { "id": "America/New_York", "offset": -14400000 },
      "userLocale": "en-US",
      "hostApp": "WORKFLOW",
      "platform": "WEB"
    }
  };
}

/**
 * Example test execution of an AppSheet Add Rows custom step.
 */
function runMockStepTest() {
  const mockPayload = {
    appId: "YOUR_APP_ID",
    tableName: "Orders",
    rowsData: JSON.stringify([
      { "Order ID": "ORD-101", "Customer": "Alice", "Amount": 150.00 }
    ])
  };

  const mockEvent = createMockStudioEvent(mockPayload);
  console.log("Constructed Mock Event:", JSON.stringify(mockEvent, null, 2));

  // Invoke your custom step execute function:
  // const result = onExecuteAddRows(mockEvent);
  // console.log("Execution Result:", JSON.stringify(result, null, 2));
}
