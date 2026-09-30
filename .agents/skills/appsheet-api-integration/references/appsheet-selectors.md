# AppSheet Selector Expressions & Formulas

When using the `Find` action, the `Properties.Selector` property accepts standard AppSheet expressions.

---

## Common Selector Patterns

### 1. Simple Filter
Filter by exact match:
```appsheet
FILTER("Customers", [Status] = "Active")
```

Filter by multiple criteria:
```appsheet
FILTER("Orders", AND([Status] = "Pending", [Total] > 100))
```

### 2. Limit Results (`TOP`)
Retrieve at most `N` matching rows:
```appsheet
TOP(FILTER("Tasks", [AssignedTo] = USEREMAIL()), 5)
```

Fetch the first row (used for schema inspection):
```appsheet
TOP(FILTER("Documents", TRUE), 1)
```

### 3. Sorting & Ordering (`ORDERBY`)
Sort ascending or descending:
```appsheet
ORDERBY(FILTER("Invoices", [Paid] = FALSE), [DueDate], FALSE)
```
*(Last parameter: `FALSE` = Ascending, `TRUE` = Descending).*

### 4. Text & Date Comparisons
Contains substring:
```appsheet
FILTER("Products", CONTAINS([Name], "Widget"))
```

Date comparisons:
```appsheet
FILTER("Events", [EventDate] >= TODAY())
```

---

## Escaping in Apps Script Strings

When constructing selector strings in Google Apps Script:
```javascript
// Escape table quotes inside template literals:
const selector = `TOP(FILTER("${tableName}", [Status] = "${status}"), 10)`;
```
If table names contain spaces:
```javascript
const selector = `FILTER("Order Details", [Quantity] > 0)`;
```
