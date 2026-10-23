import { buildCompanySummaries } from '../utils/summaryText.js';
import { copyToClipboard } from '../utils/clipboard.js';

export default function IndentSummaryTab({ conducts, cwos, monthKey }) {
  const summaries = buildCompanySummaries(conducts, monthKey, cwos);

  const copyAll = () => {
    const text = summaries.map((s) => s.text).join('\n\n---\n\n');
    copyToClipboard(text);
  };

  if (!summaries.length) {
    return (
      <div className="summary-panel">
        <p className="empty-label">No conducts added for this month yet.</p>
      </div>
    );
  }

  return (
    <div className="summary-panel">
      <div className="summary-toolbar">
        <button className="btn btn-secondary" onClick={copyAll}>
          Copy all companies
        </button>
      </div>
      {summaries.map((s) => (
        <div key={s.companyCode} className="summary-block">
          <div className="summary-block-header">
            <span className="summary-block-title">{s.companyName} COY</span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => copyToClipboard(s.text)}
            >
              Copy
            </button>
          </div>
          <pre className="summary-text">{s.text}</pre>
        </div>
      ))}
    </div>
  );
}
