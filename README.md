# SCH2 Conduct & Indent Scheduler

A React web app for planning SCH2 company conducts and auto-generating the
vehicle, medic, bus/troop-lift, and indent summary outputs that go with them.

## What it does

- **Calendar tab** — month view with company-coloured chips. Click a day to add
  a conduct; click a chip to edit or delete. Multi-day BTP (2 days) and IFC
  (5 days) auto-span from a single start date with per-day labels (`btp1`/`btp2`,
  `SIT test` on day 5). Location shown where applicable (BTP range, FC site,
  ER/IPPT venue).
- **Add Conduct popup** — pick company and conduct, fill sub-fields (BTP range,
  IFC FC site + SIT test site, ER venue, etc.). CWO name/number always editable.
  BTP and IFC compute end dates automatically from fixed duration.
- **Vehicle tab** — auto-built indent rows grouped by conduct date (prepark rows
  stay with their conduct). Multi-day: 5Ton prepark once; SOUV/F550, 5Ton, and
  LUV listed per day. BPK generates a single LUV prepark row only.
- **Bus / Troop-lift tab** — trip rows for BTP, HG, IFC, BIC, and ISAD with
  matrix-based timing gaps between paired 4-bus departures.
- **Medic tab** — one row per conduct per day.
- **Indent Summary tab** — per-company CWO update text blocks with copy buttons
  (AMMO placeholders left empty per spec).
- **re-IFC** and **re-SIT test** — calendar-only conducts (no sheet rows).
- All data persists in `localStorage`.

## Getting it running

```bash
npm install
npm run dev
```

## Project layout

```
src/
  data/
    companies.js     company codes, names, colours
    conducts.js      conduct catalogue, timing tables, location options
    busMatrix.js     travel-time matrix for bus trips
  utils/
    dateUtils.js     ISO date helpers, working-day math
    rulesEngine.js   vehicle + medic resource rules
    busEngine.js     bus/troop-lift trip generation
    buildRows.js     spreadsheet row builders
    summaryText.js   per-company CWO indent summary text
    clipboard.js     copy-to-clipboard / CSV export
    storage.js       localStorage + legacy conduct migration
  components/
    AddConductModal.jsx
    CalendarTab.jsx, VehicleTab.jsx, MedicTab.jsx, BusTab.jsx, IndentSummaryTab.jsx
    SpreadsheetTable.jsx, MonthNav.jsx
  App.jsx
```

Business logic lives in `conducts.js`, `rulesEngine.js`, `busEngine.js`, and
`busMatrix.js`.

## Assumptions

1. **ER/IPPT venue** — explicit dropdown for medical-coverage rule evaluation.
2. **SOC BP / Non-BP** — dedicated sub-field separate from BMT/Non-BMT toggle.
3. **BPK** — LUV prepark only (previous working day 16:00 → conduct day 17:00).
4. **BTP** — unified 2-day conduct; user picks 100m Range I or II.
5. **IFC** — 5-day conduct from start date; FC Site 1–11 + Sittest Site 1/2
   (defaults to Site 1). Calendar day 5 labelled SIT test; spreadsheets treat
   all 5 days as FC for medic/vehicle.
6. **BIC bus trips** — AM/PM session picker for bus timing; vehicle/medic stay
   full-day highkey.
7. **Bus gaps** — second 4-bus departure = first time + `2 × matrix travel minutes`.
8. **Previous working day** — skips Sat/Sun only (no public holiday calendar).
9. **Not conducting** — still on calendar (struck through) but no indent rows.
10. **Legacy data** — BTP1/BTP2 → BTP, BPK2 → BPK on load.

# TCRS-RESOURCE-APP
