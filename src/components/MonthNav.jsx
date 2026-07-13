import { MONTH_NAMES } from '../utils/dateUtils.js';

function shiftMonth(monthKey, delta) {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function MonthNav({ monthKey, onChange }) {
  const [y, m] = monthKey.split('-').map(Number);
  return (
    <div className="month-nav">
      <button className="btn btn-ghost" onClick={() => onChange(shiftMonth(monthKey, -1))} aria-label="Previous month">
        ‹
      </button>
      <div className="month-label">
        {MONTH_NAMES[m - 1]} {y}
      </div>
      <button className="btn btn-ghost" onClick={() => onChange(shiftMonth(monthKey, 1))} aria-label="Next month">
        ›
      </button>
    </div>
  );
}
