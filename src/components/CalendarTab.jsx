import { dateRange, toISO } from '../utils/dateUtils.js';
import { conductDisplayName, conductLocation, conductTypeColor } from '../data/conducts.js';
import {
  companyColor,
  companyColorLight,
  companySchool,
  schoolColorLight,
} from '../data/companies.js';

function buildGrid(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(y, m, 0).getDate();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(toISO(new Date(y, m - 1, d)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function chipStyleForConduct(c, homeSchool) {
  const school = companySchool(c.companyCode) || c.school;
  const isHome = school === homeSchool;

  if (isHome) {
    const coy = companyColor(c.companyCode);
    const fill = conductTypeColor(c.conductKey);
    return {
      borderLeftColor: coy,
      background: fill,
      '--chip-coy-color': coy,
    };
  }

  const wash = schoolColorLight(school);
  return {
    borderLeftColor: wash,
    background: wash,
    '--chip-coy-color': wash,
  };
}

function chipStyleForNote(note, homeSchool) {
  const school = companySchool(note.companyCode) || note.school;
  const isHome = school === homeSchool;

  if (isHome) {
    const coy = companyColor(note.companyCode);
    const fill = companyColorLight(note.companyCode);
    return {
      borderLeftColor: coy,
      background: fill,
      '--chip-coy-color': coy,
    };
  }

  const wash = schoolColorLight(school);
  return {
    borderLeftColor: wash,
    background: wash,
    '--chip-coy-color': wash,
  };
}

export default function CalendarTab({
  monthKey,
  conducts,
  notes = [],
  homeSchool,
  onDayClick,
  onDateCornerClick,
  onConductClick,
  onNoteClick,
}) {
  const cells = buildGrid(monthKey);
  const today = toISO(new Date());

  const byDate = {};
  for (const c of conducts) {
    const end = c.endDate || c.date;
    for (const day of dateRange(c.date, end)) {
      if (day.slice(0, 7) !== monthKey) continue;
      (byDate[day] ||= []).push({ kind: 'conduct', item: c, day });
    }
  }
  for (const n of notes) {
    const end = n.endDate || n.date;
    for (const day of dateRange(n.date, end)) {
      if (day.slice(0, 7) !== monthKey) continue;
      (byDate[day] ||= []).push({ kind: 'note', item: n, day });
    }
  }

  return (
    <div className="calendar-panel">
      <div className="calendar-grid calendar-grid-head">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="calendar-head-cell">
            {d}
          </div>
        ))}
      </div>
      <div className="calendar-grid">
        {cells.map((iso, i) => (
          <div
            key={i}
            className={`calendar-cell ${iso ? '' : 'calendar-cell-empty'} ${iso === today ? 'calendar-cell-today' : ''}`}
            onClick={() => iso && onDayClick && onDayClick(iso)}
          >
            {iso && (
              <>
                <button
                  type="button"
                  className={`calendar-date ${iso === today ? 'calendar-date-today' : ''}`}
                  aria-label={`Add note on ${iso}`}
                  title="Add note"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDateCornerClick ? onDateCornerClick(iso) : onDayClick?.(iso);
                  }}
                >
                  {parseInt(iso.slice(8), 10)}
                </button>
                <div className="calendar-entries">
                  {(byDate[iso] || []).map(({ kind, item, day }) => {
                    if (kind === 'note') {
                      const style = chipStyleForNote(item, homeSchool);
                      return (
                        <div
                          key={`note-${item.id}-${day}`}
                          className="calendar-chip"
                          style={{
                            borderLeftColor: style.borderLeftColor,
                            background: style.background,
                            '--chip-coy-color': style['--chip-coy-color'],
                          }}
                          data-coy={item.companyCode}
                          onClick={(e) => {
                            e.stopPropagation();
                            onNoteClick && onNoteClick(item);
                          }}
                        >
                          {item.companyCode && (
                            <span className="chip-coy">{item.companyCode}</span>
                          )}
                          {item.title && (
                            <span className="note-chip-title" title={item.title}>{item.title}</span>
                          )}
                          {(item.remarks || item.body) && (
                            <span className="note-chip-remarks" title={item.remarks || item.body}>
                              {item.remarks || item.body}
                            </span>
                          )}
                        </div>
                      );
                    }

                    const c = item;
                    const loc = conductLocation(c, day);
                    const style = chipStyleForConduct(c, homeSchool);
                    return (
                      <div
                        key={`${c.id}-${day}`}
                        className="calendar-chip"
                        style={{
                          borderLeftColor: style.borderLeftColor,
                          background: style.background,
                          '--chip-coy-color': style['--chip-coy-color'],
                        }}
                        data-coy={c.companyCode}
                        onClick={(e) => {
                          e.stopPropagation();
                          onConductClick && onConductClick(c);
                        }}
                      >
                        <span className="chip-coy">
                          {[c.companyCode, ...(c.followingCompanyCodes || [])].filter(Boolean).join(' + ')}
                        </span>
                        <span className="chip-name">{conductDisplayName(c, day)}</span>
                        {loc && <span className="chip-location">{loc}</span>}
                        {c.period && <span className="chip-period">{c.period}</span>}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
