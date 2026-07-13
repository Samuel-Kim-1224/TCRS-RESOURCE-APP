import { dateRange, toISO } from '../utils/dateUtils.js';
import { conductDisplayName, conductLocation } from '../data/conducts.js';
import { companyColor } from '../data/companies.js';

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

export default function CalendarTab({ monthKey, conducts, onDayClick, onConductClick }) {
  const cells = buildGrid(monthKey);

  const byDate = {};
  for (const c of conducts) {
    const end = c.endDate || c.date;
    for (const day of dateRange(c.date, end)) {
      if (day.slice(0, 7) !== monthKey) continue;
      (byDate[day] ||= []).push({ conduct: c, day });
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
            className={`calendar-cell ${iso ? '' : 'calendar-cell-empty'}`}
            onClick={() => iso && onDayClick && onDayClick(iso)}
          >
            {iso && (
              <>
                <div className="calendar-date">{parseInt(iso.slice(8), 10)}</div>
                <div className="calendar-entries">
                  {(byDate[iso] || []).map(({ conduct: c, day }) => {
                    const loc = conductLocation(c, day);
                    const color = companyColor(c.companyCode);
                    return (
                      <div
                        key={`${c.id}-${day}`}
                        className={`calendar-chip ${c.status === 'not conducting' ? 'chip-cancelled' : ''}`}
                        style={{ borderLeftColor: color, '--chip-coy-color': color }}
                        data-coy={c.companyCode}
                        onClick={(e) => {
                          e.stopPropagation();
                          onConductClick && onConductClick(c);
                        }}
                      >
                        <span className="chip-coy" style={{ color }}>
                          {c.companyCode}
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
