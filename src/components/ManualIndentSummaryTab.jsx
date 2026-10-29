import { useEffect, useRef, useState } from 'react';
import { copyToClipboard } from '../utils/clipboard.js';
import { buildManualCompanySummaries, mergeManualSources } from '../utils/manualSummaryText.js';
import { loadManualIndentSummary, saveManualIndentSummary } from '../lib/database.js';

function UploadWorkspace({
  files,
  setFiles,
  pastedText,
  setPastedText,
  dragOver,
  setDragOver,
  busy,
  error,
  onGenerate,
  onCancel,
  isUpdate,
}) {
  const inputRef = useRef(null);

  const addFiles = (nextFiles) => {
    const xlsxFiles = [...nextFiles].filter((file) => /\.xlsx?$/i.test(file.name));
    if (!xlsxFiles.length && nextFiles.length) return;
    setFiles((current) => {
      const combined = [...current, ...xlsxFiles];
      const seen = new Set();
      return combined.filter((file) => {
        const key = `${file.name}|${file.size}|${file.lastModified}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });
  };

  return (
    <div className={isUpdate ? 'manual-upload-modal modal-box' : 'manual-upload-card'} onClick={(event) => event.stopPropagation()}>
      <div className="manual-upload-header">
        <div>
          <span className="form-label">{isUpdate ? 'Update this month' : 'Create this month’s summary'}</span>
          <p className="manual-upload-copy">Add any combination of ICRF, Medic, and Troop Lift files. New files replace that source type for this month; other source types stay in place.</p>
        </div>
        {isUpdate && <button type="button" className="btn btn-ghost" onClick={onCancel} aria-label="Close upload">×</button>}
      </div>

      <div
        className={`manual-dropzone ${dragOver ? 'manual-dropzone-active' : ''}`}
        onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
        onDragLeave={(event) => { event.preventDefault(); setDragOver(false); }}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          addFiles(event.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          multiple
          className="manual-file-input"
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = '';
          }}
        />
        <div className="manual-dropzone-mark" aria-hidden="true">⇧</div>
        <strong>Drop XLSX files here</strong>
        <span>or choose multiple files to auto-detect their type</span>
        <button type="button" className="btn btn-secondary" onClick={() => inputRef.current?.click()}>
          Choose files
        </button>
      </div>

      {files.length > 0 && (
        <div className="manual-file-list" aria-label="Selected files">
          {files.map((file, index) => (
            <div className="manual-file-chip" key={`${file.name}-${file.lastModified}-${index}`}>
              <span>{file.name}</span>
              <button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}>×</button>
            </div>
          ))}
        </div>
      )}

      <label className="form-section manual-paste-section">
        <span className="form-label">Or paste a Troop Lift schedule</span>
        <span className="manual-upload-copy">Paste the daily list copied from your schedule. Its month must match the month selected above.</span>
        <textarea
          className="text-input manual-paste-input"
          rows={9}
          value={pastedText}
          onChange={(event) => setPastedText(event.target.value)}
          placeholder={'October TL Schedule\n\n01/10\n0700 MTL - RHC 1 BUSES (E COY GPMG Team)'}
        />
      </label>

      {error && <div className="status-message status-error" role="alert">{error}</div>}
      <div className="manual-upload-actions">
        {isUpdate && <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button>}
        <button type="button" className="btn btn-primary" onClick={onGenerate} disabled={busy || (!files.length && !pastedText.trim())}>
          {busy ? 'Processing files…' : 'Generate Indent Summary'}
        </button>
      </div>
    </div>
  );
}

function SummaryBlocks({ summaries }) {
  const copyAll = () => copyToClipboard(summaries.map((summary) => summary.text).join('\n\n---\n\n'));
  return (
    <div className="summary-panel">
      <div className="summary-toolbar">
        <button className="btn btn-secondary" onClick={copyAll}>Copy all companies</button>
      </div>
      {summaries.map((summary) => (
        <div key={summary.companyCode} className="summary-block">
          <div className="summary-block-header">
            <span className="summary-block-title">
              {summary.companyCode === 'TBD' ? summary.companyName : `${summary.companyName} COY`}
            </span>
            <button className="btn btn-secondary btn-sm" onClick={() => copyToClipboard(summary.text)}>Copy</button>
          </div>
          <pre className="summary-text">{summary.text}</pre>
        </div>
      ))}
    </div>
  );
}

export default function ManualIndentSummaryTab({ homeSchool, monthKey }) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [files, setFiles] = useState([]);
  const [pastedText, setPastedText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  useEffect(() => {
    const currentRequest = ++requestId.current;
    let active = true;
    setLoading(true);
    setBusy(false);
    setRecord(null);
    setError('');
    setUploadOpen(false);
    setFiles([]);
    setPastedText('');
    if (!homeSchool) {
      setLoading(false);
      return undefined;
    }
    loadManualIndentSummary(homeSchool, monthKey)
      .then((data) => { if (active) setRecord(data); })
      .catch((loadError) => { if (active) setError(loadError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => {
      active = false;
      if (requestId.current === currentRequest) requestId.current += 1;
    };
  }, [homeSchool, monthKey]);

  const resetUpload = () => {
    setFiles([]);
    setPastedText('');
    setError('');
    setDragOver(false);
  };

  const closeUpload = () => {
    if (busy) return;
    setUploadOpen(false);
    resetUpload();
  };

  const generate = async () => {
    if (busy || !homeSchool) return;
    const currentRequest = requestId.current;
    setBusy(true);
    setError('');
    try {
      const [{ parseIndentWorkbook, parsePastedTroopLift }] = await Promise.all([
        import('../utils/manualIndentImport.js'),
      ]);
      const additions = {};
      for (const file of files) {
        const parsed = await parseIndentWorkbook(file, { monthKey, homeSchool });
        for (const [type, rows] of Object.entries(parsed)) {
          additions[type] = [...(additions[type] || []), ...rows];
        }
      }
      if (pastedText.trim()) {
        const trips = parsePastedTroopLift(pastedText, { monthKey, homeSchool });
        additions.troopLift = [...(additions.troopLift || []), ...trips];
      }
      if (!Object.keys(additions).length) {
        throw new Error('Choose at least one XLSX file or paste a Troop Lift list before generating.');
      }
      if (requestId.current !== currentRequest) return;

      const sources = mergeManualSources(record?.sources || {}, additions);
      const summaries = buildManualCompanySummaries(sources, homeSchool);
      const saved = await saveManualIndentSummary({ school: homeSchool, monthKey, sources, summaries });
      if (requestId.current !== currentRequest) return;
      setRecord(saved);
      setUploadOpen(false);
      resetUpload();
    } catch (generationError) {
      if (requestId.current === currentRequest) {
        setError(generationError.message || 'Could not generate the manual indent summary.');
      }
    } finally {
      if (requestId.current === currentRequest) setBusy(false);
    }
  };

  if (loading) {
    return <div className="manual-summary-skeleton" aria-label="Loading manual indent summary"><span /><span /><span /></div>;
  }

  if (homeSchool === 'HQ') {
    return (
      <div className="manual-summary-empty-heading">
        <span className="form-label">School account required</span>
        <p className="manual-upload-copy">Manual indent summaries are generated for one school at a time. Sign in with a school account to create or view its summaries.</p>
      </div>
    );
  }

  const summaries = record?.summaries || [];
  const hasSummary = summaries.length > 0;

  return (
    <div className="manual-summary-panel">
      {error && hasSummary && !uploadOpen && <div className="status-message status-error" role="alert">{error}</div>}
      {hasSummary ? (
        <>
          <div className="manual-summary-toolbar">
            <div>
              <span className="form-label">Manual indent summary</span>
              <p className="manual-upload-copy">Generated for this school and month. Upload updated source files to refresh their corresponding sections.</p>
            </div>
            <button type="button" className="btn btn-primary" onClick={() => { resetUpload(); setUploadOpen(true); }}>
              Update Indent Summary
            </button>
          </div>
          <SummaryBlocks summaries={summaries} />
        </>
      ) : (
        <>
          <div className="manual-summary-empty-heading">
            <span className="form-label">No generated summary for this month</span>
            <p className="manual-upload-copy">Upload the current files to create this month’s school-only indent summary.</p>
          </div>
          <UploadWorkspace
            files={files}
            setFiles={setFiles}
            pastedText={pastedText}
            setPastedText={setPastedText}
            dragOver={dragOver}
            setDragOver={setDragOver}
            busy={busy}
            error={error}
            onGenerate={generate}
            onCancel={closeUpload}
            isUpdate={false}
          />
        </>
      )}

      {uploadOpen && hasSummary && (
        <div className="modal-backdrop" onClick={closeUpload}>
          <div className="manual-upload-dialog">
            <UploadWorkspace
              files={files}
              setFiles={setFiles}
              pastedText={pastedText}
              setPastedText={setPastedText}
              dragOver={dragOver}
              setDragOver={setDragOver}
              busy={busy}
              error={error}
              onGenerate={generate}
              onCancel={closeUpload}
              isUpdate
            />
          </div>
        </div>
      )}
      {record?.updatedAt && hasSummary && (
        <span className="manual-updated-at">Updated {new Date(record.updatedAt).toLocaleString()}</span>
      )}
    </div>
  );
}
