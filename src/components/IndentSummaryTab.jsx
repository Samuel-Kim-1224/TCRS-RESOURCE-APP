import { useEffect, useMemo, useRef, useState } from 'react';
import { companySchool } from '../data/companies.js';
import { buildCompanySummaries } from '../utils/summaryText.js';
import { copyToClipboard } from '../utils/clipboard.js';
import { IMPORT_TYPES, buildImportedSummary, detectWorkbookType, parseWorkbookAsType } from '../utils/summaryImport.js';
import { readXlsxFile } from '../utils/xlsxReader.js';
import { clearImportedSummary, loadImportedSummary, saveImportedSummary } from '../utils/summaryImportStorage.js';

let nextUploadId = 0;

function makeUploadId() {
  nextUploadId += 1;
  return `upload-${Date.now()}-${nextUploadId}`;
}

function typeLabel(type) {
  return IMPORT_TYPES.find((item) => item.id === type)?.label || 'Choose type';
}

export default function IndentSummaryTab({ conducts, cwos, monthKey, homeSchool }) {
  const [savedImport, setSavedImport] = useState(() => loadImportedSummary(homeSchool));
  const [uploads, setUploads] = useState([]);
  const [isReading, setIsReading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const fileInput = useRef(null);

  useEffect(() => {
    setSavedImport(loadImportedSummary(homeSchool));
    setUploads([]);
    setMessage('');
    setError('');
  }, [homeSchool]);

  const imported = useMemo(
    () => savedImport
      ? buildImportedSummary(savedImport.sources, savedImport.assignments || {}, homeSchool || 'HQ', monthKey)
      : null,
    [savedImport, homeSchool, monthKey],
  );
  const ordinarySummaries = useMemo(
    () => {
      const scopedConducts = homeSchool === 'HQ'
        ? conducts
        : conducts.filter((conduct) => (companySchool(conduct.companyCode) || conduct.school) === homeSchool);
      return buildCompanySummaries(scopedConducts, monthKey, cwos);
    },
    [conducts, homeSchool, monthKey, cwos],
  );
  const isUsingImportedSummary = !!savedImport;
  const summaries = isUsingImportedSummary ? imported?.summaries || [] : ordinarySummaries;

  const duplicateTypes = useMemo(() => {
    const counts = new Map();
    for (const upload of uploads) {
      if (upload.assignedType) counts.set(upload.assignedType, (counts.get(upload.assignedType) || 0) + 1);
    }
    return new Set([...counts].filter(([, count]) => count > 1).map(([type]) => type));
  }, [uploads]);

  const canUpdate = uploads.length > 0 &&
    !isReading &&
    !isUpdating &&
    duplicateTypes.size === 0 &&
    uploads.every((upload) => upload.assignedType && upload.parsed && !upload.error);

  const updateLabel = useMemo(() => {
    const types = [...new Set(uploads.map((upload) => upload.assignedType).filter(Boolean))];
    const ordered = IMPORT_TYPES.filter((type) => types.includes(type.id)).map((type) => type.label);
    if (ordered.length === IMPORT_TYPES.length && !savedImport) return 'Generate Summary';
    return `Update ${ordered.join(' + ') || 'Summary'}`;
  }, [uploads, savedImport]);

  const readFiles = async (fileList) => {
    const selected = Array.from(fileList || []);
    if (!selected.length) return;
    setError('');
    setMessage('');
    setIsReading(true);

    const entries = selected.map((file) => ({
      id: makeUploadId(),
      name: file.name,
      workbook: null,
      detectedType: '',
      assignedType: '',
      parsed: null,
      error: '',
      status: 'Reading workbook…',
    }));
    setUploads((current) => [...current, ...entries]);

    await Promise.all(selected.map(async (file, index) => {
      const upload = entries[index];
      let workbook = null;
      let detectedType = '';
      try {
        workbook = await readXlsxFile(file);
        detectedType = detectWorkbookType(workbook);
        const parsed = detectedType ? parseWorkbookAsType(workbook, detectedType) : null;
        setUploads((current) => current.map((item) => item.id === upload.id
          ? {
            ...item,
            workbook,
            detectedType,
            assignedType: detectedType,
            parsed,
            status: detectedType ? 'Ready to update' : 'Type not detected — choose a type below.',
            error: '',
          }
          : item));
      } catch (fileError) {
        setUploads((current) => current.map((item) => item.id === upload.id
          ? {
            ...item,
            workbook,
            detectedType,
            assignedType: detectedType,
            status: workbook ? 'Workbook layout needs attention.' : 'Could not read this workbook.',
            error: fileError.message || 'The workbook could not be read.',
          }
          : item));
      }
    }));

    setIsReading(false);
  };

  const assignType = async (uploadId, type) => {
    const upload = uploads.find((item) => item.id === uploadId);
    if (!upload) return;
    setError('');

    if (!type) {
      setUploads((current) => current.map((item) => item.id === uploadId
        ? { ...item, assignedType: '', parsed: null, error: '', status: 'Choose the workbook type.' }
        : item));
      return;
    }

    if (!upload.workbook) return;
    setUploads((current) => current.map((item) => item.id === uploadId
      ? { ...item, assignedType: type, parsed: null, error: '', status: 'Checking workbook layout…' }
      : item));

    try {
      const parsed = parseWorkbookAsType(upload.workbook, type);
      setUploads((current) => current.map((item) => item.id === uploadId
        ? { ...item, assignedType: type, parsed, error: '', status: `Ready as ${typeLabel(type)}.` }
        : item));
    } catch (fileError) {
      setUploads((current) => current.map((item) => item.id === uploadId
        ? { ...item, assignedType: type, parsed: null, error: fileError.message || 'This workbook does not match that type.', status: 'Workbook type does not match.' }
        : item));
    }
  };

  const removeUpload = (uploadId) => {
    setUploads((current) => current.filter((item) => item.id !== uploadId));
    setError('');
    setMessage('');
  };

  const handleUpdate = () => {
    if (!canUpdate) return;
    setIsUpdating(true);
    setError('');
    setMessage('');

    try {
      const sources = { ...(savedImport?.sources || {}) };
      for (const upload of uploads) {
        sources[upload.assignedType] = {
          fileName: upload.name,
          monthHint: upload.parsed.monthHint || '',
          warnings: upload.parsed.warnings || [],
          records: upload.parsed.records,
        };
      }

      const recordIds = new Set(Object.values(sources).flatMap((source) => source.records.map((record) => record.id)));
      const assignments = Object.fromEntries(
        Object.entries(savedImport?.assignments || {}).filter(([recordId]) => recordIds.has(recordId)),
      );
      const nextImport = { sources, assignments, updatedAt: new Date().toISOString() };
      if (!saveImportedSummary(homeSchool, nextImport)) {
        throw new Error('The updated summary could not be saved in this browser. Free up browser storage and try again.');
      }

      setSavedImport(nextImport);
      setUploads([]);
      const updatedLabels = IMPORT_TYPES
        .filter((type) => sources[type.id]?.records?.length)
        .map((type) => type.label);
      setMessage(`Summary updated. Current sources: ${updatedLabels.join(', ')}.`);
    } catch (updateError) {
      setError(updateError.message || 'The summary could not be updated. Your previous summary is unchanged.');
    } finally {
      setIsUpdating(false);
    }
  };

  const updateAssignment = (recordId, blockId) => {
    if (!savedImport) return;
    const assignments = { ...(savedImport.assignments || {}) };
    if (blockId) assignments[recordId] = blockId;
    else delete assignments[recordId];
    const nextImport = { ...savedImport, assignments };
    if (!saveImportedSummary(homeSchool, nextImport)) {
      setError('The assignment could not be saved in this browser. Free up browser storage and try again.');
      return;
    }
    setSavedImport(nextImport);
    setError('');
  };

  const clearImport = () => {
    if (!window.confirm('Clear this uploaded summary and return to the summary generated from saved conducts?')) return;
    if (!clearImportedSummary(homeSchool)) {
      setError('The uploaded summary could not be cleared from this browser.');
      return;
    }
    setSavedImport(null);
    setUploads([]);
    setMessage('Returned to the summary generated from saved conducts.');
    setError('');
  };

  const copyAll = async () => {
    try {
      await copyToClipboard(summaries.map((summary) => summary.text).join('\n\n---\n\n'));
      setMessage('All company summaries copied.');
      setError('');
    } catch {
      setError('Could not copy the summaries. Check clipboard permissions and try again.');
    }
  };

  const copyOne = async (summary) => {
    try {
      await copyToClipboard(summary.text);
      setMessage(`${summary.companyName} summary copied.`);
      setError('');
    } catch {
      setError('Could not copy the summary. Check clipboard permissions and try again.');
    }
  };

  const savedWarnings = IMPORT_TYPES.flatMap((type) =>
    (savedImport?.sources?.[type.id]?.warnings || []).map((warning) => `${type.label}: ${warning}`),
  );

  return (
    <div className="summary-panel">
      <section className="summary-import-panel" aria-label="Build summary from uploaded workbooks">
        <div className="summary-import-heading">
          <div>
            <h2>Build from spreadsheets</h2>
            <p>Drop one or more .xlsx files here. The workbook contents are used to identify each type.</p>
          </div>
          {isUsingImportedSummary && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={clearImport}>
              Return to saved conducts
            </button>
          )}
        </div>

        <button
          type="button"
          className="summary-dropzone"
          onClick={() => fileInput.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            readFiles(event.dataTransfer.files);
          }}
          disabled={isReading || isUpdating}
        >
          <strong>{isReading ? 'Reading workbooks…' : 'Choose or drop .xlsx workbooks'}</strong>
          <span>ICRF, MEDIC, and Troop Lift can be selected together or added in separate batches.</span>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          multiple
          hidden
          onChange={(event) => {
            readFiles(event.target.files);
            event.target.value = '';
          }}
        />

        {uploads.length > 0 && (
          <div className="summary-upload-list" aria-label="Selected workbooks">
            {uploads.map((upload) => (
              <div className={`summary-upload-row ${upload.error ? 'summary-upload-error' : ''}`} key={upload.id}>
                <div className="summary-upload-file">
                  <strong title={upload.name}>{upload.name}</strong>
                  <span>{upload.status}</span>
                  {upload.error && <span className="summary-upload-error-text">{upload.error}</span>}
                </div>
                <label className="summary-upload-type">
                  <span>Use as</span>
                  <select
                    className="text-input"
                    value={upload.assignedType}
                    onChange={(event) => assignType(upload.id, event.target.value)}
                    disabled={isUpdating || isReading}
                  >
                    <option value="">Choose type</option>
                    {IMPORT_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
                  </select>
                </label>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => removeUpload(upload.id)}
                  aria-label={`Remove ${upload.name}`}
                  disabled={isUpdating}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {duplicateTypes.size > 0 && (
          <div className="status-message status-error">
            More than one workbook is assigned to {IMPORT_TYPES.filter((type) => duplicateTypes.has(type.id)).map((type) => type.label).join(', ')}.
            Remove a duplicate or change its assigned type before updating.
          </div>
        )}

        {savedImport && (
          <div className="summary-saved-sources">
            <strong>Currently used:</strong>
            {IMPORT_TYPES.map((type) => {
              const source = savedImport.sources?.[type.id];
              return (
                <span className={`summary-source-chip ${source ? '' : 'summary-source-missing'}`} key={type.id}>
                  {type.label}: {source?.fileName || 'not uploaded yet'}
                </span>
              );
            })}
            <span className="summary-source-scope">Changes are saved in this browser for {homeSchool === 'HQ' ? 'HQ' : `School ${homeSchool || ''}`}.</span>
          </div>
        )}

        {error && <div className="status-message status-error" role="alert">{error}</div>}
        {message && <div className="status-message status-success" role="status">{message}</div>}

        {uploads.some((upload) => upload.parsed?.warnings?.length) && (
          <div className="summary-import-warnings">
            {uploads.flatMap((upload) => upload.parsed?.warnings || []).map((warning, index) => (
              <p key={`${warning}-${index}`}>{warning}</p>
            ))}
          </div>
        )}
        {savedWarnings.length > 0 && (
          <div className="summary-import-warnings">
            {savedWarnings.map((warning) => <p key={warning}>{warning}</p>)}
          </div>
        )}

        <div className="summary-import-actions">
          <span className="field-hint">
            A partial update replaces only the types uploaded now; other saved source types are retained.
          </span>
          <button type="button" className="btn btn-primary" onClick={handleUpdate} disabled={!canUpdate}>
            {isUpdating ? 'Updating…' : updateLabel}
          </button>
        </div>
      </section>

      {isUsingImportedSummary && imported?.review?.length > 0 && (
        <section className="summary-review-panel">
          <div className="summary-review-heading">
            <div>
              <h2>Review unmatched rows</h2>
              <p>Rows not matched automatically remain here until assigned to an eligible conduct block.</p>
            </div>
            <span className="summary-review-count">{imported.review.length} row{imported.review.length === 1 ? '' : 's'}</span>
          </div>
          <div className="summary-review-list">
            {imported.review.map((record) => (
              <div className="summary-review-row" key={record.id}>
                <div className="summary-review-info">
                  <span className="summary-review-source">{typeLabel(record.sourceType)} · row {record.sourceRow}</span>
                  <strong>{record.companyCode ? `${record.companyCode} COY` : record.companyRaw || 'Company not detected'} · {record.activity || 'Conduct not detected'}</strong>
                  <span>{record.resolvedDate ? `${formatDDMMYY(record.resolvedDate)}${record.time ? ` · ${record.time}` : ''}` : 'Date not detected'}{record.resource ? ` · ${record.resource}` : ''}</span>
                </div>
                <label className="summary-review-assignment">
                  <span>Assign to block</span>
                  <select
                    className="text-input"
                    value={savedImport.assignments?.[record.id] || ''}
                    onChange={(event) => updateAssignment(record.id, event.target.value)}
                  >
                    <option value="">Leave in review</option>
                    {record.candidateBlocks.map((block) => <option value={block.id} key={block.id}>{block.label}</option>)}
                  </select>
                  {!record.candidateBlocks.length && <small>No same-company block covers this date.</small>}
                </label>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="summary-toolbar">
        <button className="btn btn-secondary" onClick={copyAll} disabled={!summaries.length}>
          Copy all companies
        </button>
        {isUsingImportedSummary && <span className="summary-imported-indicator">Showing uploaded summary{imported?.month ? ` · ${imported.month}` : ''}</span>}
      </div>
      {!summaries.length ? (
        <p className="empty-label">
          {isUsingImportedSummary
            ? 'No matching company summary rows were found in the uploaded files.'
            : 'No conducts added for this month yet.'}
        </p>
      ) : summaries.map((summary) => (
        <div key={summary.companyCode} className="summary-block">
          <div className="summary-block-header">
            <span className="summary-block-title">{summary.companyName} COY</span>
            <button className="btn btn-secondary btn-sm" onClick={() => copyOne(summary)}>Copy</button>
          </div>
          <pre className="summary-text">{summary.text}</pre>
        </div>
      ))}
    </div>
  );
}
