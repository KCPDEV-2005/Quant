Add a view toggle to the existing Hierarchical Stats tab in the MERN app.
Do NOT rebuild the tab from scratch — only modify the district-level and
taluka-level drill-down views. The state-level bar chart stays as-is.

---

## WHAT TO ADD

When the user drills into a state (Level 2 — District view) or a district
(Level 3 — Taluka view), show three view options via a toggle button group
in the top-right corner of that panel:

[ Bar Chart ]  [ Treemap ]  [ Table ]

The active view is highlighted. Default view is Bar Chart.
Store the selected view in React component state (not URL, not localStorage).
The toggle persists while the user stays on the same drill level but resets
to Bar Chart when they navigate to a different state or district.

---

## VIEW 1 — BAR CHART (dynamic height, scrollable)

Problem to fix: when a state has 35+ districts or a district has 20+ talukas,
bars become tiny and unreadable.

Fix:
- Wrap the Recharts chart in a div with overflow-y: auto and max-height: 520px
- Calculate chart height dynamically: chartHeight = items.length * 44 + 60
  (minimum 300px)
- Pass this height to the ResponsiveContainer and the BarChart component
- Set barSize={28} fixed — never let Recharts auto-size bars
- Set tick font size to 12px on the Y axis
- Add margin={{ left: 20, right: 60 }} so long district/taluka names are not clipped
- The scrollable wrapper must NOT clip the chart horizontally — only scroll vertically
- Show value labels at the end of each bar (inside or outside depending on bar length)

Implementation:
const chartHeight = Math.max(300, data.length * 44 + 60);
<div style={{ overflowY: 'auto', maxHeight: '520px' }}>
  <ResponsiveContainer width="100%" height={chartHeight}>
    <BarChart data={data} layout="vertical" margin={{ left: 20, right: 60 }}>
      <XAxis type="number" tick={{ fontSize: 11 }} />
      <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
      <Tooltip />
      <Bar dataKey="schools" barSize={28} fill="#2563EB" radius={[0,4,4,0]}>
        <LabelList dataKey="schools" position="right" style={{ fontSize: 11 }} />
      </Bar>
    </BarChart>
  </ResponsiveContainer>
</div>

---

## VIEW 2 — TREEMAP

Use the Treemap component already available in Recharts (no new library needed).

District level treemap:
- Each rectangle = one district
- Rectangle area = school count (use schools as the size value)
- Label inside each rectangle: district name + school count
- Color: use a single blue sequential scale — darker = more schools
  Generate color using: interpolateBlues from a simple inline function:
  const blueScale = (value, max) => {
    const intensity = Math.round(50 + (value / max) * 180);
    return `rgb(30, ${Math.round(80 + (value/max)*100)}, ${Math.round(180 + (value/max)*60)})`;
  }
  Simpler alternative: use a fixed palette array of 8 blue shades and assign
  by rank (darkest = highest school count)
- On click of a rectangle → drill into that district (same as clicking a row
  in the table)
- Show a tooltip on hover: District name | Schools: X | Students: Y | Talukas: Z

Taluka level treemap:
- Same as above but rectangles = talukas, sized by school count
- Use green scale instead of blue at taluka level
- No drill-down on click at taluka level (it's the deepest level)

Recharts Treemap usage:
import { Treemap, Tooltip } from 'recharts';
<ResponsiveContainer width="100%" height={420}>
  <Treemap
    data={treemapData}
    dataKey="schools"
    aspectRatio={4/3}
    stroke="#fff"
    content={<CustomTreemapContent />}
  >
    <Tooltip content={<CustomTooltip />} />
  </Treemap>
</ResponsiveContainer>

CustomTreemapContent component:
- Renders a <g> with a <rect> and <text> inside
- Only show label text if rect width > 60 and height > 30 (avoid tiny labels)
- District name: font-size 12, white, bold, truncated with ellipsis if needed
- School count: font-size 11, white, below the name
- On click: call the same drill-down handler used by the table rows

---

## VIEW 3 — PAGINATED TABLE WITH MINI BARS

A clean table where each row has a small inline bar showing relative size.
No chart library needed — pure HTML/CSS via inline styles.

Columns:
Rank | Name | Mini Bar | Schools | Students | Batches | (Talukas — only at district level)

Mini bar implementation:
- A div inside the table cell
- Width = (value / maxValue) * 100% of a fixed 120px container
- Background: #2563EB for districts, #16A34A for talukas
- Height: 8px, border-radius: 4px
- Show the number to the right of the bar

Pagination:
- Show 15 rows per page
- Prev / Next buttons at the bottom
- "Showing 1–15 of 35 districts" label
- Page resets to 1 when user switches state or district

Sorting:
- Clicking any column header sorts by that column (toggle asc/desc)
- Default sort: schools descending
- Show a small ↑ ↓ indicator next to the active sort column

Search/filter:
- A small search input above the table (placeholder: "Search districts..." or
  "Search talukas...")
- Filters rows in real time as user types (case-insensitive match on name)
- When filtering, hide pagination and show all matching results (max 50)
- Clear button (×) inside the search input

Table row hover: background #f0f4f8
Rank column: muted grey number, 40px wide
Name column: left-aligned, 180px wide, font-weight 500
Mini bar column: 140px wide (120px bar + 20px for the number)
Count columns: center-aligned, 80px wide each

---

## TOGGLE BUTTON GROUP

Position: top-right of the district/taluka panel header, same row as the
panel title ("Districts in Maharashtra" / "Talukas in Satara")

Styling:
- Three buttons side by side, no gap, shared border
- Active button: background #1a3a5c, text white
- Inactive button: background white, text #374151, border #d1d5db
- Border radius: 6px on left button left side, 6px on right button right side
- Height: 32px, font-size: 13px, padding: 0 12px
- Icons (use any icon library already in project, or text only):
  Bar Chart | Treemap | Table

Component:
const views = ['barchart', 'treemap', 'table'];
const [activeView, setActiveView] = useState('barchart');

<div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid #d1d5db' }}>
  {views.map(v => (
    <button
      key={v}
      onClick={() => setActiveView(v)}
      style={{
        padding: '0 12px', height: 32, fontSize: 13, border: 'none',
        borderRight: v !== 'table' ? '1px solid #d1d5db' : 'none',
        background: activeView === v ? '#1a3a5c' : 'white',
        color: activeView === v ? 'white' : '#374151',
        cursor: 'pointer'
      }}
    >
      {v === 'barchart' ? 'Bar Chart' : v === 'treemap' ? 'Treemap' : 'Table'}
    </button>
  ))}
</div>

---

## COMPONENT STRUCTURE

Modify the existing HierarchicalStats component:

1. Add state: const [districtView, setDistrictView] = useState('barchart')
2. Add state: const [talukaView, setTalukaView] = useState('barchart')
3. Reset view to 'barchart' inside the existing handleStateClick and
   handleDistrictClick functions
4. At Level 2 (district view), render the toggle + conditionally render one
   of three components: DistrictBarChart, DistrictTreemap, DistrictTable
5. At Level 3 (taluka view), render the toggle + conditionally render one
   of three components: TalukaBarChart, TalukaTreemap, TalukaTable
6. Extract each into its own small component in the same file for clarity

---

## IMPORTANT NOTES FOR DEVELOPER

- All three views receive the same data prop — no extra API calls needed
- Recharts Treemap is already available if recharts is installed — no new
  packages needed
- The mini bar in Table view is pure CSS — no chart library
- Do NOT change Level 1 (state view) — it stays as the existing bar chart
- Do NOT change the breadcrumb, the back button, or any other part of the tab
- The toggle resets to Bar Chart on every drill-down navigation
- Test with Maharashtra's 35 districts and Satara's 11 talukas to verify
  all three views render correctly at scale