import { useState } from 'react';
import { companiesForSchool, companyColor } from '../data/companies.js';

const emptyForm = {
  companyCode: '',
  title: '',
  remarks: '',
  date: '',
  endDate: '',
  multiday: false,
};

function entryToForm(entry) {
  if (!entry) return emptyForm;
  const end = entry.endDate || entry.date || '';
  const start = entry.date || '';
  return {
    companyCode: entry.companyCode || '',
    title: entry.title || '',
    remarks: entry.remarks || entry.body || '',
    date: start,
    endDate: end,
    multiday: !!(start && end && end !== start),
  };
}

export default function AddNoteModal({
  homeSchool,
  onSave,
  onDelete,
  onClose,
  initialDate,
  editEntry,
  readOnly = false,
}) {
  const isEdit = !!editEntry;
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [form, setForm] = useState(() => {
    if (editEntry) return entryToForm(editEntry);
    return initialDate ? { ...emptyForm, date: initialDate } : emptyForm;
  });

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const companies = companiesForSchool(homeSchool);

  const isValid =
    !!(form.title.trim() || form.remarks.trim()) &&
    !!form.date &&
    (!form.multiday || (!!form.endDate && form.endDate >= form.date));

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      await onSave({
        companyCode: form.companyCode,
        title: form.title.trim(),
        remarks: form.remarks.trim(),
        date: form.date,
        endDate: form.multiday ? form.endDate : form.date,
        school: homeSchool,
        id: editEntry?.id,
      });
    } catch (error) {
      setSubmitError(error.message);
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editEntry || !onDelete || submitting) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      await onDelete(editEntry.id);
    } catch (error) {
      setSubmitError(error.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{readOnly ? 'Note Details' : isEdit ? 'Edit Note' : 'Add Note'}</h2>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-body">
          <section className="form-section">
            <label className="form-label">Company (optional)</label>
            <div className="pill-row">
              <button
                type="button"
                className={`pill ${form.companyCode ? '' : 'pill-active'}`}
                disabled={readOnly}
                onClick={() => set({ companyCode: '' })}
              >
                No company
              </button>
              {companies.map((c) => {
                const active = form.companyCode === c.code;
                const color = companyColor(c.code);
                return (
                  <button
                    key={c.code}
                    type="button"
                    className={`pill pill-school ${active ? 'pill-active' : ''}`}
                    disabled={readOnly}
                    style={{
                      '--school-color': color,
                      ...(active
                        ? { background: color, borderColor: color, color: '#fff' }
                        : { borderColor: color, color }),
                    }}
                    onClick={() => set({ companyCode: c.code })}
                  >
                    {c.code}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="form-section">
            <label className="form-label">Title</label>
            <input
              className="text-input"
              readOnly={readOnly}
              placeholder="Note title…"
              value={form.title}
              onChange={(e) => set({ title: e.target.value })}
            />
            <label className="form-label" style={{ marginTop: '0.5rem' }}>Remarks</label>
            <textarea
              className="text-input note-textarea"
              readOnly={readOnly}
              rows={4}
              placeholder="Remarks…"
              value={form.remarks}
              onChange={(e) => set({ remarks: e.target.value })}
            />
          </section>

          <section className="form-section">
            <label className="form-label">Date</label>
            <input
              type="date"
              className="text-input date-input"
              disabled={readOnly}
              value={form.date}
              onChange={(e) => set({ date: e.target.value })}
            />
            <label className="note-multiday">
              <input
                type="checkbox"
                disabled={readOnly}
                checked={form.multiday}
                onChange={(e) => {
                  const multiday = e.target.checked;
                  set({
                    multiday,
                    endDate: multiday ? form.endDate || form.date : form.date,
                  });
                }}
              />
              Multiday
            </label>
            {form.multiday && (
              <>
                <label className="form-label" style={{ marginTop: '0.75rem' }}>
                  End date
                </label>
                <input
                  type="date"
                  className="text-input date-input"
                  disabled={readOnly}
                  value={form.endDate}
                  min={form.date}
                  onChange={(e) => set({ endDate: e.target.value })}
                />
              </>
            )}
          </section>
        </div>

        <div className="modal-footer">
          {submitError && <div className="status-message status-error">{submitError}</div>}
          {isEdit && !readOnly && (
            <button
              className="btn btn-danger btn-block"
              disabled={submitting}
              onClick={handleDelete}
            >
              {submitting ? 'Please wait…' : 'Delete note'}
            </button>
          )}
          {!readOnly && (
            <button className="btn btn-block" disabled={!isValid || submitting} onClick={handleSubmit}>
              {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add note'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
