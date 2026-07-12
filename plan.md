You are building a MERN (MongoDB, Express, React, Node.js) web application called "School Head Matcher". Here is the complete specification:

---

## PURPOSE
Allow an admin to upload two CSV/Excel files:
1. School Registration Data (master school list)
2. School Heads Data (list of school heads with name + phone)

The app matches school heads to schools based on phone number and name, stores data in MongoDB with upsert logic, and generates a downloadable report.

---

## MONGODB COLLECTIONS

### Collection 1: `schools`
Upsert key: `registrationId` (maps to "Registration ID" column)
Fields to store:
- registrationId
- schoolName
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
- primaryCoordinatorPhone (store as String, strip .0 and whitespace)
- alternateCoordinatorName
- alternateCoordinatorPhone (store as String, strip .0 and whitespace)
- totalStudents
- totalBatches
- totalStandards
- submissionDate
- lastUpdatedOn
- createdAt (set on first insert only)
- updatedAt (always set to now on upsert)

### Collection 2: `schoolHeads`
Upsert key: `phone` (maps to "Contact No" column)
Fields to store:
- name (trim whitespace)
- phone (store as String, trim whitespace, strip .0)
- createdAt (set on first insert only)
- updatedAt (always set to now on upsert)

---

## DATA UPLOAD LOGIC (CRITICAL)

For BOTH collections, use MongoDB **upsert** (updateOne with upsert: true):
- Match on the upsert key (registrationId for schools, phone for heads)
- If record exists → update all fields EXCEPT createdAt
- If record does not exist → insert with createdAt = now
- This means re-uploading the same file or an updated file is always safe — no duplicates will be created

Phone number handling (apply to ALL phone fields before saving):
- Convert to string
- Remove trailing ".0" (e.g. "9876543210.0" → "9876543210")
- Trim all whitespace
- Store as plain string (e.g. "9876543210")

---

## MATCHING LOGIC

When user clicks "Run Match" or views the match report:
1. Fetch all schoolHeads from MongoDB
2. For each school head, search schools collection where:
   - primaryCoordinatorPhone === head.phone (exact string match)
   OR
   - alternateCoordinatorPhone === head.phone (exact string match)
3. Additionally verify name match (case-insensitive, trimmed):
   - If matched on primaryCoordinatorPhone → compare primaryCoordinatorName.toLowerCase().trim() === head.name.toLowerCase().trim()
   - If matched on alternateCoordinatorPhone → compare alternateCoordinatorName.toLowerCase().trim() === head.name.toLowerCase().trim()
4. If phone matches but name does NOT match → still include in results but flag as "Phone matched, Name mismatch" so admin can verify manually
5. Build result object per match:
   {
     headName: string,
     headPhone: string,
     matchedAs: "Primary Coordinator" | "Alternate Coordinator",
     nameMatchStatus: "Matched" | "Mismatch - verify manually",
     nameInSchoolSheet: string,
     schoolName: string,
     registrationId: string,
     state: string,
     district: string,
     primaryCoordinatorName: string,
     primaryCoordinatorPhone: string,
     alternateCoordinatorName: string,
     alternateCoordinatorPhone: string
   }

---

## API ENDPOINTS

POST /api/upload/schools
- Accept multipart/form-data with a CSV or Excel file
- Parse file (use multer + papaparse for CSV, xlsx library for Excel)
- Upsert each row into schools collection
- Return: { inserted: N, updated: N, total: N }

POST /api/upload/heads
- Accept multipart/form-data with a CSV or Excel file
- Parse file
- Upsert each row into schoolHeads collection
- Return: { inserted: N, updated: N, total: N }

GET /api/match
- Run matching logic (described above)
- Return array of match result objects

GET /api/match/download
- Run matching logic
- Return as downloadable CSV file
- Filename: matched_school_heads_<YYYY-MM-DD>.csv

GET /api/schools/count → returns total schools in DB
GET /api/heads/count → returns total heads in DB

---

## REACT FRONTEND (simple, clean UI)

### Pages / Sections (single page app is fine):

1. **Dashboard / Stats Bar**
   - Total Schools in DB
   - Total School Heads in DB
   - Total Matches Found (run on load)

2. **Upload Section**
   Two upload cards side by side:
   - "Upload School Data" → calls POST /api/upload/schools
   - "Upload School Heads" → calls POST /api/upload/heads
   Each card shows:
   - File picker (accept .csv, .xlsx)
   - Upload button
   - After upload: show summary → "X records inserted, Y records updated"
   - Show a note: "Re-uploading is safe — duplicates are handled automatically"

3. **Match Results Section**
   - "Run Match" button → calls GET /api/match
   - Shows results in a table with columns:
     Head Name | Head Phone | School Name | District | Matched As | Name Match Status
   - Rows where Name Match Status = "Mismatch - verify manually" should be highlighted in yellow
   - "Download CSV" button → calls GET /api/match/download

---

## TECH STACK
- MongoDB with Mongoose
- Express.js
- React (with Axios for API calls, plain CSS or Tailwind)
- Node.js
- multer (file upload)
- papaparse (CSV parsing)
- xlsx / sheetjs (Excel parsing)

---

## IMPORTANT NOTES FOR DEVELOPER
- Always store phones as strings, never numbers — avoids float issues like 9876543210.0
- The school data CSV has a header row — skip it
- Some phone fields in school data may be empty (NaN) — handle gracefully, do not store as "NaN" string, store as null
- Both files may have leading/trailing spaces in column headers — always trim column names on parse
- The app should work for files with 3000+ rows without timeout — use bulk upsert operations (bulkWrite with upsert) not row-by-row saves
- Use MongoDB bulkWrite for upsert — much faster than individual updateOne calls for large files