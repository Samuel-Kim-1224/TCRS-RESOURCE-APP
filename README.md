# SCH2 Conduct & Indent Scheduler

A React web app for planning SCH2 company conducts and auto-generating the
vehicle and medic indent spreadsheets that go with them.

## What it does

- **Calendar tab** — month view, click any day or "+ Add Conduct" to log a
  conduct. Each day shows minimal chips: company, conduct, AM/PM.
- **Add Conduct popup** — pick a company (auto-fills the saved CWO name/number,
  or asks for them once and remembers them from then on), pick a conduct,
  fill in whatever sub-fields that conduct needs (RM distance + PES, ER
  number + venue, CC number, SOC PES, IPPT venue), pick AM/PM (disabled and
  greyed out for full-day "highkey" conducts), conducting/not conducting,
  BMT/Non-BMT, and a date (or date range for BTP1/BTP2).
- **Vehicle tab** — auto-built indent rows in the 13-column format described
  in the brief (SCH2 - COY - conduct, vehicle type, qty, qty, date/time
  starting, date ending, company name x2, CWO name, CWO number, "TCRS 1
  SCH 2", PREPARK flag), generated from the timing + resource-requirement
  rules. Prepark rows for 5-Ton are generated automatically the working day
  before, and LUV draw/return rows are generated for all highkey conducts.
- **Medic tab** — one row per conduct per day (Date / Period / COY / Start /
  End / Conduct), always present even when no medic vehicle is actually
  required for that conduct (start/end just come out blank), and repeated
  for every day of a multi-day conduct.
- **Indent Summary tab** — one row per conduct for the month: date(s),
  company, conduct, period, status, which vehicles were indented, and
  whether a medic was required. Useful as a quick-glance check against the
  Vehicle/Medic tabs.
- **Bus / Troop-lift tab** — left as an empty placeholder sheet, exactly as
  asked, ready for you to define those rules later.
- Every sheet has a **"Copy for spreadsheet"** button, which puts
  tab-separated values on your clipboard — paste directly into Excel or
  Google Sheets and it lands in proper columns. There's also a **Download
  CSV** button per sheet.
- All data is saved to the browser's `localStorage`, so it survives page
  reloads on the same device/browser without needing a backend.

## Getting it running

```bash
npm install
npm run dev
```

Then open the local URL Vite prints (usually `http://localhost:5173`).

To build a static production bundle (e.g. for GitHub Pages, Netlify,
Vercel):

```bash
npm run build
```

This outputs static files to `dist/`, which you can host anywhere — no
server/backend required.

## Pushing to GitHub

```bash
git init
git add .
git commit -m "Initial SCH2 conduct scheduler"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

`node_modules` and `dist` are already excluded via `.gitignore`.

## Project layout

```
src/
  data/
    companies.js     company codes <-> written-out names
    conducts.js       conduct catalogue, timing tables, dropdown options
  utils/
    dateUtils.js      ISO date helpers, working-day math, date ranges
    rulesEngine.js     the resource-requirement rules (the heart of the app)
    buildRows.js        turns rule output into actual spreadsheet rows
    clipboard.js         copy-to-clipboard / CSV export
    storage.js          localStorage persistence
  components/
    AddConductModal.jsx  the "add conduct" popup form
    CalendarTab.jsx, VehicleTab.jsx, MedicTab.jsx, BusTab.jsx, IndentSummaryTab.jsx
    SpreadsheetTable.jsx generic table + copy/export toolbar
    MonthNav.jsx          shared month switcher
  App.jsx                 tabs, state, wiring
```

All the actual business logic (timings, resource tables) lives in
`src/data/conducts.js` and `src/utils/rulesEngine.js` — if the rules change,
those are the two files to edit.

## Assumptions made where the brief was ambiguous

The source spec was very detailed but a few gaps had to be filled in to make
the logic actually runnable. These are the calls I made — flag any of them
if they're wrong and they're easy to change in `conducts.js` /
`rulesEngine.js`:

1. **ER/IPPT venue.** The medical-coverage rule ("Stadium, Ladang, Eliss 1 =
   covered; J-track, Eliss 2 = not covered") needs to know *which* venue a
   given ER/IPPT is at, but the form spec only listed an ER number dropdown
   (5/6/7/8) and no venue field. I added a **Venue** dropdown for both ER and
   IPPT with those five options, so the coverage rule can actually be
   evaluated. The ER 5/6/7/8 number is otherwise just used for the display
   name ("ER5", etc.) and doesn't affect resourcing.
2. **SOC BP / Non-BP.** SOC's rule ("BP: F550 ONLY / Non-BP: no indent")
   needs a BP/non-BP distinction that isn't the same as the general BMT /
   Non-BMT PES toggle. I added a small dedicated **PES (BP / Non-BP)**
   sub-field just for SOC.
3. **BPK2.** Treated as itself being the prepark block described in
   "Special Group 2" — selecting a date creates one 5-Ton row from
   `16:00` that day to `17:00` the next day. It doesn't separately trigger
   the generic RM/highkey prepark logic.
4. **CC.** No resource table was given for CC, so it currently generates no
   vehicle indent and a blank-time Medic row (it still shows on the
   calendar and gets tracked). If CC does need resourcing, add a case for
   it in `rulesEngine.js`.
5. **Multi-day conducts.** Only BTP1/BTP2 were treated as potentially
   spanning multiple days (start + end date pickers), since the brief's
   "FC" multi-day medic example most plausibly maps to a field-exercise-type
   conduct. Every other conduct is single-day. Medic rows are generated for
   every day in range either way.
6. **"Previous working day"** skips Saturdays and Sundays only (no public
   holiday calendar). Adjust `isWorkingDay()` in `dateUtils.js` if your unit
   observes different rest days.
7. **Not conducting.** When a conduct is toggled "not conducting", it still
   shows on the calendar (struck through) but generates no vehicle/medic
   rows, on the assumption that a cancelled conduct needs no resources.

## Notes on the data model

Conducts are stored as plain objects (see `AddConductModal.jsx`'s
`emptyForm` for the shape) in an array in `localStorage`. CWOs are stored
separately as `{ [companyCode]: { name, number } }` so they're remembered
across every conduct you add for that company from then on.
# TCRS-RESOURCE-APP
