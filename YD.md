Add a new feature called "Year-on-Year School Comparison" to the existing
MERN app. Do NOT modify any existing code — only add new routes, a new
MongoDB collection, and a new tab.

---

## WHAT THIS FEATURE DOES

The admin uploads last year's school list (different format — see below).
The app compares it against the current year's schools collection using
UDISE code as the unique key and shows:
- Which schools registered THIS year (new + returning)
- Which schools from LAST year did NOT register this year (missing)
- Which schools are NEW this year (not in last year's list at all)

---

## LAST YEAR SHEET FORMAT (columns in order)

The uploaded file has these columns (may have slight name variations —
match by position OR by trimmed lowercase header name):

Col 1:  BLK / Block (block number or name)
Col 2:  Block Name
Col 3:  Cluster
Col 4:  Village
Col 5:  PinCode
Col 6:  Ucode / UDISE code  ← PRIMARY MATCH KEY
Col 7:  School Name
Col 8:  Management
Col 9:  class
Col 10: R/U (Rural/Urban)
Col 11: Medium1 (Medium of instruction)
Col 12: Enrollment
Col 13: Teachers
Col 14: HM Name (Head Master Name)
Col 15: Pad (Designation)
Col 16: Mobile No.
Col 17: Email Id

Store only these fields per record:
- udiseCode (from col 6 — store as trimmed string, strip .0)
- schoolName (col 7)
- blockName (col 2)
- cluster (col 3)
- village (col 4)
- pincode (col 5)
- management (col 8)
- medium (col 11)
- enrollment (col 12, numeric)
- hmName (col 14)
- hmPhone (col 16, store as string)
- hmEmail (col 17)

---

## MONGODB COLLECTION: `lastYearSchools`

Upsert key: udiseCode
Fields: all fields listed above + createdAt + updatedAt
Use bulkWrite with upsert:true (same pattern as existing collections).
If udiseCode is empty/null/NaN → skip that row entirely (do not insert).

---

## COMPARISON LOGIC

Run on demand when user clicks "Run Comparison" button.
Uses MongoDB aggregation — do NOT load full collections into memory.

Step 1 — Get all UDISE codes from current year (schools collection,
field: udiseCode)

Step 2 — Get all UDISE codes from last year (lastYearSchools collection,
field: udiseCode)

Step 3 — Classify each school:

A. "Registered This Year" (returned):
   UDISE exists in BOTH lastYearSchools AND schools
   → Show current year school data + last year HM name for reference

B. "Not Registered This Year" (missing):
   UDISE exists in lastYearSchools but NOT in schools
   → Show last year school data — these schools need follow-up

C. "New This Year" (new registration):
   UDISE exists in schools but NOT in lastYearSchools
   → Show current year school data — first time registering

Return summary counts + full lists for each category.

---

## API ENDPOINTS

POST /api/upload/lastyear
- Accept multipart/form-data with CSV or Excel file
- Parse file (support both .csv and .xlsx)
- Trim all column headers
- Detect UDISE column by checking header names (case-insensitive):
  look for "ucode", "udise", "udise code", "registration code"
  If not found by name, use column index 5 (0-based)
- Skip rows where UDISE is empty, null, "nan", or "undefined"
- Upsert into lastYearSchools using bulkWrite
- Return: { inserted, updated, skipped, total }

GET /api/compare/summary
Returns:
{
  lastYearTotal: number,
  currentYearTotal: number,
  registeredThisYear: number,    // in both
  notRegisteredThisYear: number, // in last year only
  newThisYear: number,           // in current year only
}

GET /api/compare/registered
Returns array of schools that exist in both collections:
[{
  udiseCode, schoolName, state, district, subDistrict,
  currentYearRegistrationId,
  lastYearHmName, lastYearHmPhone,
  currentYearPrimaryCoordinator, currentYearPrimaryPhone
}]

GET /api/compare/missing
Returns array of schools from last year NOT in current year:
[{
  udiseCode, schoolName, blockName, cluster, village,
  management, medium, enrollment,
  hmName, hmPhone, hmEmail
}]

GET /api/compare/new
Returns array of schools in current year NOT in last year:
[{
  udiseCode, schoolName, state, district, subDistrict,
  management, mediumOfInstruction,
  primaryCoordinatorName, primaryCoordinatorPhone
}]

GET /api/compare/download?type=registered|missing|new
Returns downloadable CSV for the requested category.
Filename: schools_<type>_<YYYY-MM-DD>.csv

---

## CSV DOWNLOAD FORMATS

### registered (both years):
UDISE Code | School Name | State | District | Sub-district |
Last Year HM Name | Last Year HM Phone |
Current Year Primary Coordinator | Current Year Primary Phone |
Current Year Registration ID

### missing (last year only — needs follow-up):
UDISE Code | School Name | Block Name | Cluster | Village |
Management | Medium | Enrollment | HM Name | HM Phone | HM Email

### new (current year only):
UDISE Code | School Name | State | District | Sub-district |
Management | Medium of Instruction |
Primary Coordinator | Primary Coordinator Phone

---

## REACT FRONTEND — NEW TAB: "Year Comparison"

Add this as a new tab in the existing navigation.
All new components go in src/components/comparison/

---

### Section 1 — Upload Last Year Data

Upload card (same style as existing upload cards):
- Title: "Upload Last Year School List"
- File picker: accept .csv, .xlsx
- Upload button with loading spinner
- After upload: "X inserted, Y updated, Z skipped (no UDISE)"
- Show last upload timestamp if available
- Note: "Match is done using UDISE code only"

---

### Section 2 — Summary Cards (show after comparison is run)

Four stat cards in a row:

Card 1 — Last Year Total (grey)
"X schools in last year's list"

Card 2 — Registered This Year (green) ✓
"X schools registered again"
Sub: "XX.X% retention rate"

Card 3 — Not Registered This Year (red) ✗
"X schools missing this year"
Sub: "Need follow-up"

Card 4 — New This Year (blue) ★
"X new schools"
Sub: "First time registration"

Below cards: a simple donut chart (Recharts) showing the three categories
as segments — Returned (green) | Missing (red) | New (blue)

---

### Section 3 — Results Tabs

Three sub-tabs inside this section:
[ ✓ Registered (X) ]  [ ✗ Missing (X) ]  [ ★ New (X) ]

Each sub-tab shows a searchable, sortable table.

#### ✓ Registered Tab
Columns: UDISE | School Name | District | Last Year HM | Current Coordinator | Phone
Search: by school name or UDISE
Download button: "Download CSV"

#### ✗ Missing Tab — most important
Columns: UDISE | School Name | Block | Village | HM Name | Phone | Email
Row background: light red (#fef2f2) to highlight urgency
Search: by school name, UDISE, or block
Download button: "Download Missing Schools CSV"
Note above table: "These schools registered last year but have not registered
this year. Use HM contact details to follow up."

#### ★ New Tab
Columns: UDISE | School Name | District | Sub-district | Coordinator | Phone
Search: by school name or UDISE
Download button: "Download CSV"

All three tables:
- Show 20 rows per page with Prev/Next pagination
- Sort by school name by default
- Show total count above table: "Showing X–Y of Z schools"

---

## IMPORTANT NOTES FOR DEVELOPER

- UDISE match must be STRING comparison after trimming and stripping .0
  Never compare as numbers — UDISE codes can have leading zeros
- Last year file may have merged header rows or extra blank rows at top —
  detect the header row by finding the row that contains "ucode" or "udise"
  (case-insensitive). Skip all rows before it.
- Some UDISE values may come as scientific notation from Excel
  (e.g. 2.735e+10) — convert properly: Math.round(Number(val)).toString()
- All new backend routes go in a new file: routes/comparison.js
  Mount in app.js as /api/compare and /api/upload/lastyear
- All new React components in src/components/comparison/
- Do NOT modify schools collection, schoolHeads collection, or any
  existing routes
- The lastYearSchools collection is append+upsert only —
  re-uploading is always safe
- Run comparison fresh on each button click — do not cache results