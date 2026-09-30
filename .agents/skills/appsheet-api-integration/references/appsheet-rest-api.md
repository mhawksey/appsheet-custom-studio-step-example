# AppSheet REST API Payloads & Endpoints

All operations use HTTP `POST` against:
`https://api.appsheet.com/api/v2/apps/{appId}/tables/{tableName}/Action`

---

## 1. `Add` Action
Inserts one or more rows.

### Request Body
```json
{
  "Action": "Add",
  "Properties": {
    "Locale": "en-US",
    "Timezone": "UTC"
  },
  "Rows": [
    {
      "Name": "Project Falcon",
      "Drive Link": "https://docs.google.com/document/d/...",
      "Status": "Draft"
    }
  ]
}
```

### Response
Returns the newly inserted rows, including any system-generated keys (such as `UNIQUEID()`) and initial column values.

---

## 2. `Edit` Action
Updates existing rows.

### Request Body
```json
{
  "Action": "Edit",
  "Properties": {
    "Locale": "en-US",
    "Timezone": "UTC"
  },
  "Rows": [
    {
      "KeyColumnName": "ROW_KEY_VALUE",
      "Status": "Completed",
      "Reviewer": "john@example.com"
    }
  ]
}
```
*Note: Only columns specified in the object are modified. Unspecified columns retain their current values.*

---

## 3. `Find` Action
Finds rows matching criteria specified in `Properties.Selector`.

### Request Body
```json
{
  "Action": "Find",
  "Properties": {
    "Locale": "en-US",
    "Timezone": "UTC",
    "Selector": "FILTER(\"Documents\", [Status] = \"Draft\")"
  },
  "Rows": []
}
```

### Response
Array of matching row objects with all column values.

---

## 4. `Delete` Action
Deletes specified rows.

### Request Body
```json
{
  "Action": "Delete",
  "Properties": {},
  "Rows": [
    {
      "KeyColumnName": "ROW_KEY_VALUE"
    }
  ]
}
```

---

## Error Handling & Status Codes

| Code | Cause | Resolution |
| :--- | :--- | :--- |
| `401 Unauthorized` | Invalid `ApplicationAccessKey` | Check key in AppSheet editor under Manage > Integrations |
| `404 Not Found` | Table name or App ID does not match | Verify exact case-sensitive table name |
| `400 Bad Request` | Missing required column or invalid formula | Check column validation rules in AppSheet |
| `429 Too Many Requests` | API rate limit reached | Mark error as retryable (`ErrorRetryability.RETRYABLE`) |
