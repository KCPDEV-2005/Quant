You are adding an Advanced Statistics Feature to an existing MERN application.
Do NOT touch or modify any existing code — only add new routes, components, and one new nav tab.

---

## WHAT ALREADY EXISTS (do not modify)
- MongoDB collection: `schools` (already populated with school registration data)
- MongoDB collection: `schoolHeads`
- All existing upload and matching routes and components
- Existing nav/tab structure

---

## WHAT TO ADD

### 1. Two new backend routes (add to existing Express app)

GET /api/stats/overview
GET /api/stats/hierarchy
GET /api/export/excel

### 2. Two new React tabs
- "Statistics" tab → overview dashboard with charts
- "Hierarchical Stats" tab → state → district → taluka drill-down
- "Export Report" tab → download full Excel report

---

## EXISTING `schools` COLLECTION FIELD NAMES (use exactly these)
- registrationId
- programmeYear
- submissionDate
- schoolName
- udiseCode
- state
- district
- subDistrict
- village
- cluster
- pincode
- managementType
- mediumOfInstruction
- schoolEmail
- principalName
- primaryCoordinatorName
- primaryCoordinatorPhone
- alternateCoordinatorName
- alternateCoordinatorPhone
- jeevanvidyaRefName
- jeevanvidyaRefPhone
- totalStandards
- totalBatches
- totalStudents
- standardsSelected

(If any field name differs in your actual schema, map accordingly — do not rename existing fields)

---

## BACKEND: GET /api/stats/overview

Run MongoDB aggregations and return one JSON object with all of the following:

### A. Overall Counts
- totalSchools
- totalStudents (sum of totalStudents)
- totalBatches (sum of totalBatches)
- totalStandards (sum of totalStandards)
- totalStates (count distinct state values)
- totalDistricts (count distinct district values)
- totalTalukas (count distinct subDistrict values)
- totalPrimaryCoordinators (count where primaryCoordinatorName is not null and not empty)
- totalAlternateCoordinators (count where alternateCoordinatorName is not null and not empty)
- totalBothCoordinators (count where BOTH are filled)
- totalMissingPrimary (count where primaryCoordinatorName is null or empty)
- totalMissingAlternate (count where alternateCoordinatorName is null or empty)
- totalJeevanvidyaRefs (count distinct non-null jeevanvidyaRefPhone values)

### B. Programme Year Breakdown
Group by programmeYear:
[{ year, schoolCount, studentCount, batchCount }]

### C. Management Type Breakdown
Group by managementType:
[{ type, schoolCount, studentCount }]

### D. Medium of Instruction Breakdown
Group by mediumOfInstruction:
[{ medium, schoolCount }]

### E. Standards Distribution
Group by standardsSelected:
[{ standard, schoolCount }]

### F. Submission Timeline
Group by month-year of submissionDate:
[{ monthYear: "Jan 2026", schoolCount }]
Sorted chronologically.

### G. Missing Data Flags
- missingEmail: count where schoolEmail is null or empty
- missingPrincipal: count where principalName is null or empty
- missingUDISE: count where udiseCode is null or empty

### H. Coordinator Coverage Breakdown
Return 4 counts:
- bothCoordinators
- primaryOnly
- alternateOnly
- neitherCoordinator

Use MongoDB aggregation ($group, $sum, $addFields) for all — do not load full collection into memory.

---

## BACKEND: GET /api/stats/hierarchy

Return nested JSON:
[
  {
    state: string,
    schoolCount: number,
    studentCount: number,
    batchCount: number,
    districts: [
      {
        district: string,
        schoolCount: number,
        studentCount: number,
        batchCount: number,
        talukas: [
          {
            taluka: string,
            schoolCount: number,
            studentCount: number,
            batchCount: number
          }
        ]
      }
    ]
  }
]

- Sort by schoolCount descending at every level (state, district, taluka)
- Use MongoDB $group with $push to build nested structure in aggregation pipeline
- Restructure/sort in Node.js after aggregation

---

## BACKEND: GET /api/export/excel

Generate and stream a .xlsx file using exceljs library.
Do NOT save to disk — pipe directly to response.

Sheets (in this order):

Sheet 1 — "Summary" (tab color: blue)
Two columns: Metric | Value
List all KPI values from /api/stats/overview overview counts section.

Sheet 2 — "Programme Year" (tab color: green)
Columns: Programme Year | School Count | Student Count | Batch Count

Sheet 3 — "Management Type" (tab color: green)
Columns: Management Type | School Count | Student Count

Sheet 4 — "Medium of Instruction" (tab color: green)
Columns: Medium | School Count

Sheet 5 — "Submission Timeline" (tab color: green)
Columns: Month-Year | Schools Registered

Sheet 6 — "State Wise" (tab color: orange)
Columns: State | Schools | Students | Batches | Districts | Talukas
(aggregate district and taluka counts per state from hierarchy data)

Sheet 7 — "District Wise" (tab color: orange)
Columns: State | District | Schools | Students | Batches | Talukas

Sheet 8 — "Taluka Wise" (tab color: orange)
Columns: State | District | Taluka | Schools | Students | Batches

Sheet 9 — "Coordinator Coverage" (tab color: red)
Columns: School Name | Registration ID | State | District |
Primary Coordinator Name | Primary Coordinator Phone |
Alternate Coordinator Name | Alternate Coordinator Phone |
Coverage Status
Coverage Status values: "Both" / "Primary Only" / "Alternate Only" / "None"

Sheet 10 — "Missing Data" (tab color: red)
Columns: School Name | Registration ID | State | District |
Missing Email (Yes/No) | Missing Principal (Yes/No) | Missing UDISE (Yes/No)
Only include rows where at least one field is missing.

Excel formatting rules (apply to ALL sheets):
- Bold the header row
- Freeze top row (freeze pane at row 2)
- Auto-fit column widths (estimate based on max content length, min 12)
- Alternating row colors: white (#FFFFFF) and light grey (#F2F2F2)
- Header row background: dark blue (#1F3864), font color white

Filename: school_registration_report_<YYYY-MM-DD>.xlsx
Set Content-Disposition and Content-Type headers correctly for download.

---

## FRONTEND: THREE NEW TABS

Add these tabs to the existing nav without changing other tabs.

---

### TAB: "Statistics"

#### Section 1 — KPI Cards (responsive grid, 4 columns on desktop)
One card per metric, with icon and colored background:
- Total Schools (blue)
- Total Students (green)
- Total Batches (purple)
- Total Standards (orange)
- Total States (teal)
- Total Districts (indigo)
- Total Talukas (pink)
- Total Primary Coordinators (green)
- Total Alternate Coordinators (green)
- Schools Missing Primary Coordinator (red)
- Schools Missing Alternate Coordinator (red)
- Total Jeevanvidya Reference Persons (grey)

#### Section 2 — Charts (use Recharts only, no other chart library)

Chart 1 — Programme Year Breakdown
Type: Grouped Bar Chart
X-axis: Programme Year
Bars: School Count (blue), Student Count (green)
Include legend and tooltip

Chart 2 — Management Type
Type: Pie Chart with labels
Data: schoolCount per managementType
Include legend

Chart 3 — Medium of Instruction
Type: Horizontal Bar Chart
Y-axis: medium name, X-axis: schoolCount
Sorted by count descending

Chart 4 — Submission Timeline
Type: Line Chart
X-axis: Month-Year (chronological), Y-axis: Schools Registered
Show dot on each point, tooltip on hover

Chart 5 — Standards Distribution
Type: Bar Chart
X-axis: standard, Y-axis: schoolCount

Chart 6 — Coordinator Coverage
Type: Donut/Pie Chart
Segments: Both Coordinators | Primary Only | Alternate Only | Neither
Colors: green, blue, yellow, red

#### Section 3 — Missing Data Warning Cards
Three cards in a row (orange/red warning style):
- "X schools missing official email"
- "X schools missing principal name"
- "X schools missing UDISE code"

---

### TAB: "Hierarchical Stats"

#### Breadcrumb navigation
Shows current drill-down level:
All States → [State] → [District]
Clicking any breadcrumb item navigates back to that level.

#### Level 1 — All States (default view)
- Horizontal Bar Chart (Recharts): Top 15 states by school count
- Table below: State | Schools | Students | Batches | Districts
- Each row has a "View →" button → drills into that state

#### Level 2 — State Detail (after clicking a state)
- Title: "Districts in [State Name]"
- Horizontal Bar Chart: Districts by school count
- Table: District | Schools | Students | Batches | Talukas
- Each row has a "View →" button → drills into that district

#### Level 3 — District Detail (after clicking a district)
- Title: "Talukas in [District Name], [State Name]"
- Horizontal Bar Chart: Talukas by school count
- Table: Taluka | Schools | Students | Batches
- No further drill-down

State maintained in React component state (not URL params, keep it simple).

---

### TAB: "Export Report"

Simple centered card:
- Title: "Download Full Registration Report"
- Description: "Exports all statistics and school data as a formatted Excel file with 10 sheets."
- Button: "Generate & Download Excel Report" → GET /api/export/excel
- Show loading spinner while downloading
- On success: show "Report downloaded successfully"
- On error: show "Failed to generate report, please try again"

---

## PACKAGES TO INSTALL (backend only)
npm install exceljs

All chart packages (Recharts) should already be available in the frontend.
If not: npm install recharts

---

## IMPORTANT NOTES
- Do NOT modify any existing routes, models, or components
- All new routes go in a new file: routes/stats.js — import and mount in app.js as /api/stats and /api/export
- All new React components go in a new folder: src/components/stats/
- Fetch /api/stats/overview and /api/stats/hierarchy only once on tab open, store in component state
- All MongoDB aggregations must use the aggregation pipeline — never load full collection into JS memory
- For the Excel export, use exceljs WorkbookWriter (streaming) for large datasets
- Charts must be responsive — use ResponsiveContainer from Recharts wrapping every chart